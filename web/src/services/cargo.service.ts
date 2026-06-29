import { getActivePricing } from "@/repositories/pricing.repository";
import {
  createCargoRequest,
  findPendingCargoNearRoute,
  updateCargoStatus,
} from "@/repositories/cargo.repository";
import { prisma } from "@/lib/db/prisma";
import { broadcastToCustomer } from "@/lib/supabase/realtime";
import { notify } from "@/lib/notifications/notification.service";
import { findUserById } from "@/repositories/user.repository";

/* ── Pricing ────────────────────────────────────────────────────────────── */

/** Tính giá vận chuyển hàng dựa trên trọng lượng + khoảng cách ước tính */
export async function quoteCargo(
  distanceKm: number,
  weightKg: number,
): Promise<number> {
  const pricing = await getActivePricing();
  const cargoConf = pricing?.cargoPricing as
    | { baseFee: number; perKgFee: number; perKmFee: number }
    | null;

  const baseFee   = cargoConf?.baseFee   ?? 10_000;
  const perKgFee  = cargoConf?.perKgFee  ?? 500;
  const perKmFee  = cargoConf?.perKmFee  ?? 800;

  return Math.round(baseFee + weightKg * perKgFee + distanceKm * perKmFee);
}

/* ── Create ─────────────────────────────────────────────────────────────── */

export async function createCargo(params: {
  senderId: string;
  receiverName: string;
  receiverPhone: string;
  pickupAddress: string; pickupLat: number; pickupLng: number;
  dropoffAddress: string; dropoffLat: number; dropoffLng: number;
  weightKg: number; description?: string;
  distanceKm: number;
}) {
  const quotedPrice = await quoteCargo(params.distanceKm, params.weightKg);

  const { distanceKm: _dist, ...rest } = params;
  const cargo = await createCargoRequest({
    ...rest,
    quotedPrice,
    expiresAt: new Date(Date.now() + 24 * 3600_000),
  });

  return { cargo, quotedPrice };
}

/* ── Matching ───────────────────────────────────────────────────────────── */

/**
 * Khi một chuyến xe được kích hoạt (ACTIVE), tìm và gán hàng gần tuyến đường.
 * Mỗi chuyến nhận tối đa maxCargo kiện (mặc định 3) nếu tài xế cho phép.
 */
export async function matchCargoToTrip(tripId: string, maxCargo = 3): Promise<void> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      passengers: { include: { request: true } },
      driverProfile: true,
    },
  });

  if (!trip || !trip.driverProfile.allowCargo) return;

  // Lấy tuyến đường từ request đầu tiên
  const firstRequest = trip.passengers[0]?.request;
  if (!firstRequest) return;

  const pendingCargos = await findPendingCargoNearRoute(
    firstRequest.pickupLat,
    firstRequest.pickupLng,
    firstRequest.dropoffLat,
    firstRequest.dropoffLng,
  );

  let assigned = 0;
  for (const cargo of pendingCargos) {
    if (assigned >= maxCargo) break;

    // Kiểm tra cargo capacity
    const totalWeightAssigned = await prisma.cargoRequest.aggregate({
      where: { tripId, status: { in: ["MATCHED", "PICKED_UP"] } },
      _sum: { weightKg: true },
    });
    const usedKg = totalWeightAssigned._sum.weightKg ?? 0;
    const maxKg  = trip.driverProfile.cargoCapacityKg ?? 50;
    if (usedKg + cargo.weightKg > maxKg) continue;

    await updateCargoStatus(cargo.id, "MATCHED", {
      tripId,
      assignedAt: new Date(),
    });

    // Thông báo cho người gửi
    const sender = await findUserById(cargo.senderId);
    if (sender) {
      void broadcastToCustomer(cargo.senderId, "cargo.matched", { cargoId: cargo.id, tripId });
      void notify({
        userId: cargo.senderId,
        phone: sender.phone ?? undefined,
        email: sender.email ?? undefined,
        event: "CARGO_MATCHED",
        templateData: {
          cargoId: cargo.id,
          tripId,
          amount: String(cargo.quotedPrice),
        },
      });
    }

    assigned++;
  }
}

/* ── Completion ─────────────────────────────────────────────────────────── */

export async function markCargoDelivered(cargoId: string): Promise<void> {
  await updateCargoStatus(cargoId, "DELIVERED", { deliveredAt: new Date() });
}

/* ── Streak (anti-leakage) ──────────────────────────────────────────────── */

const STREAK_BONUS_PER_DAY = 5_000; // VND thưởng vào ví mỗi ngày streak liên tục
const MAX_DAILY_BONUS = 50_000;

export async function updateDriverStreak(driverProfileId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.driverStreak.upsert({
    where: { driverProfileId },
    create: { driverProfileId, currentStreak: 1, longestStreak: 1, lastTripDate: today },
    update: {},
  });

  const lastDate = streak.lastTripDate;
  if (!lastDate) return;

  const lastDay = new Date(lastDate);
  lastDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - lastDay.getTime()) / 86_400_000);

  let newStreak = streak.currentStreak;
  if (diffDays === 1) {
    newStreak += 1;
  } else if (diffDays > 1) {
    newStreak = 1;
  }
  // diffDays === 0 → đã tính hôm nay rồi, không đổi

  const longest = Math.max(newStreak, streak.longestStreak);
  const bonus   = Math.min(newStreak * STREAK_BONUS_PER_DAY, MAX_DAILY_BONUS);

  await prisma.driverStreak.update({
    where: { driverProfileId },
    data: {
      currentStreak: newStreak,
      longestStreak: longest,
      lastTripDate: today,
      bonusEarnedTotal: { increment: bonus },
    },
  });

  // Nạp tiền thưởng vào ví tài xế
  if (bonus > 0) {
    const wallet = await prisma.driverWallet.findUnique({ where: { driverProfileId } });
    if (wallet) {
      await prisma.$transaction([
        prisma.driverWallet.update({
          where: { driverProfileId },
          data: { withdrawableBalance: { increment: bonus } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: bonus,
            type: "TRIP_CREDIT",
            description: `Streak ${newStreak} ngày liên tiếp — thưởng giữ chân`,
          },
        }),
      ]);
    }
  }
}
