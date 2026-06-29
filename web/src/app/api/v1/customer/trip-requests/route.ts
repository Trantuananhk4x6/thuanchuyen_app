import { NextRequest } from "next/server";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CreateTripRequestSchema, ListTripsSchema } from "@/validators/customer.validator";
import {
  createTripRequest,
  findRequestsByCustomer,
  createMatch,
} from "@/repositories/trip-request.repository";
import { calculateQuote } from "@/services/matching.service";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { notify } from "@/lib/notifications/notification.service";
import { findUserById } from "@/repositories/user.repository";
import { prisma } from "@/lib/db/prisma";

const REQUEST_TTL_HOURS = 24;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ListTripsSchema.safeParse(params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const items = await findRequestsByCustomer(
    auth.payload.userId,
    parsed.data.status as never,
  );
  return ok({ items, total: items.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateTripRequestSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { pickup, dropoff, voucherCode, ...rest } = parsed.data;

  let distanceKm: number, durationMin: number, basePrice: number;
  try {
    const q = await calculateQuote(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    distanceKm = q.distanceKm;
    durationMin = q.durationMin;
    basePrice = q.quotedPrice;
  } catch (e) {
    return Errors.internal((e as Error).message ?? "Không tính được giá chuyến");
  }

  // Apply voucher discount if provided
  let quotedPrice = basePrice;
  let appliedVoucher: { id: string } | null = null;
  if (voucherCode) {
    const now = new Date();
    const voucher = await prisma.voucher.findUnique({ where: { code: voucherCode.toUpperCase() } });
    if (voucher && voucher.status === "ACTIVE" && now >= voucher.startsAt && now <= voucher.expiresAt) {
      const userUsage = await prisma.voucherUsage.count({
        where: { voucherId: voucher.id, userId: auth.payload.userId },
      });
      if (userUsage < voucher.userLimit && (voucher.usageLimit === null || voucher.usedCount < voucher.usageLimit) && basePrice >= voucher.minOrderValue) {
        let discount = 0;
        if (voucher.type === "PERCENT") {
          discount = Math.round(basePrice * (voucher.value / 100));
          if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
        } else if (voucher.type === "FIXED_AMOUNT") {
          discount = Math.min(voucher.value, basePrice);
        } else if (voucher.type === "FREE_TRIP") {
          discount = basePrice;
        }
        quotedPrice = Math.max(0, basePrice - discount);
        appliedVoucher = { id: voucher.id };
      }
    }
  }

  let request: Awaited<ReturnType<typeof createTripRequest>>;
  try {
    request = await createTripRequest({
      customer: { connect: { id: auth.payload.userId } },
      passengerName: rest.passengerName,
      passengerPhone: rest.passengerPhone,
      note: rest.note,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupAddress: rest.pickupAddress,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      dropoffAddress: rest.dropoffAddress,
      departureTime: new Date(rest.departureTime),
      seats: rest.seats,
      cargoWeightKg: rest.cargoWeightKg,
      bookingMode: rest.bookingMode,
      targetDriverId: rest.targetDriverId,
      quotedPrice,
      distanceKm,
      durationMin,
      expiresAt: new Date(Date.now() + REQUEST_TTL_HOURS * 60 * 60 * 1000),
    });
  } catch (e) {
    return Errors.internal((e as Error).message ?? "Không tạo được yêu cầu chuyến");
  }

  // Record voucher usage so it cannot be double-spent
  if (appliedVoucher) {
    await prisma.$transaction([
      prisma.voucherUsage.create({
        data: {
          voucherId: appliedVoucher.id,
          userId: auth.payload.userId,
          discount: basePrice - quotedPrice,
        },
      }),
      prisma.voucher.update({
        where: { id: appliedVoucher.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
  }

  if (rest.bookingMode === "DIRECT_BOOK" && rest.targetDriverId) {
    const targetDriver = await findDriverByUserId(rest.targetDriverId);
    if (targetDriver) {
      await createMatch({
        request: { connect: { id: request.id } },
        driverProfile: { connect: { id: targetDriver.id } },
        detourKm: 0,
        fareShare: quotedPrice,
        driverNet: Math.round(quotedPrice * 0.85),
        status: "OFFERED",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      const [customer, driverUser] = await Promise.all([
        findUserById(auth.payload.userId),
        findUserById(rest.targetDriverId),
      ]);

      if (customer && driverUser) {
        void notify({
          userId: targetDriver.userId,
          phone: driverUser.phone ?? undefined,
          event: "DIRECT_BOOK_REQUESTED",
          templateData: {
            customerName: customer.fullName ?? "Khách hàng",
            pickup: rest.pickupAddress,
            dropoff: rest.dropoffAddress,
            departureTime: rest.departureTime,
          },
        });
      }
    }
  }

  return created({ request });
}
