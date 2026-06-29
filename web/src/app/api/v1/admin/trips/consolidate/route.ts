import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { buildStopsForTrip } from "@/services/trip.service";

/**
 * POST /api/v1/admin/trips/consolidate
 * Gộp các Trip PENDING của cùng một tài xế thành một Trip duy nhất.
 * Body: { driverProfileId: string } — gộp tất cả PENDING trips của tài xế đó
 *    hoặc: { tripIds: string[] }   — gộp cụ thể các trip trong danh sách
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { driverProfileId, tripIds } = body as {
    driverProfileId?: string;
    tripIds?: string[];
  };

  if (!driverProfileId && (!tripIds || tripIds.length < 2)) {
    return Errors.validation("Cần truyền driverProfileId hoặc mảng tripIds (ít nhất 2)");
  }

  // Tìm các trips cần gộp
  const where = driverProfileId
    ? { driverProfileId, status: "PENDING" as const }
    : { id: { in: tripIds! }, status: "PENDING" as const };

  const trips = await prisma.trip.findMany({
    where,
    include: {
      passengers: { include: { request: true } },
      driverProfile: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (trips.length < 2) {
    return Errors.validation("Cần ít nhất 2 chuyến PENDING để gộp");
  }

  // Kiểm tra tất cả cùng tài xế
  const driverIds = new Set(trips.map((t) => t.driverProfileId));
  if (driverIds.size > 1) {
    return Errors.validation("Chỉ có thể gộp các chuyến của cùng một tài xế");
  }

  const primaryTrip  = trips[0];
  const sourceTrips  = trips.slice(1);
  const driverProfId = primaryTrip.driverProfileId;

  // Tính tổng ghế sau gộp
  const totalSeats = trips.reduce((s, t) => s + t.seatsFilled, 0);
  if (totalSeats > primaryTrip.seatsTotal) {
    return Errors.conflict(
      `Tổng ${totalSeats} hành khách vượt quá sức chứa xe (${primaryTrip.seatsTotal} ghế)`,
    );
  }

  await prisma.$transaction(async (tx) => {
    // Chuyển tất cả passengers từ source trips sang primary trip
    for (const src of sourceTrips) {
      for (const p of src.passengers) {
        await tx.tripPassenger.update({
          where: { id: p.id },
          data: { tripId: primaryTrip.id },
        });
        // Cập nhật TripMatch (nếu có) liên kết với request này
        await tx.tripMatch.updateMany({
          where: { requestId: p.requestId, driverProfileId: driverProfId },
          data: {},
        });
      }
      // Xóa stops cũ của source trip
      await tx.tripStop.deleteMany({ where: { tripId: src.id } });
      // Hủy source trip
      await tx.trip.update({ where: { id: src.id }, data: { status: "CANCELLED" } });
    }

    // Cập nhật seatsFilled trên primary trip
    await tx.trip.update({
      where: { id: primaryTrip.id },
      data: { seatsFilled: totalSeats },
    });

    // Xóa stops cũ của primary trip
    await tx.tripStop.deleteMany({ where: { tripId: primaryTrip.id } });
  });

  // Rebuild stops sau transaction
  await buildStopsForTrip(primaryTrip.id, driverProfId).catch(() => {});

  const merged = await prisma.trip.findUnique({
    where: { id: primaryTrip.id },
    include: { passengers: { include: { request: true } } },
  });

  return ok({
    mergedTripId: primaryTrip.id,
    cancelledTripIds: sourceTrips.map((t) => t.id),
    totalPassengers: merged?.passengers.length ?? 0,
  });
}
