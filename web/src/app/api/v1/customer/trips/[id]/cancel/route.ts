import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

/** POST /api/v1/customer/trips/:id/cancel — khách hủy chuyến */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const passenger = await prisma.tripPassenger.findFirst({
    where: { tripId: params.id, customerId: auth.payload.userId },
    include: { trip: { select: { id: true, status: true, seatsFilled: true } } },
  });

  if (!passenger) return Errors.notFound("Bạn không thuộc chuyến này");

  if (!["PENDING", "ACTIVE"].includes(passenger.trip.status)) {
    return Errors.conflict("Không thể hủy chuyến đang di chuyển hoặc đã kết thúc");
  }

  await prisma.$transaction([
    prisma.tripPassenger.update({
      where: { id: passenger.id },
      data:  { legStatus: "DROPPED" },
    }),
    prisma.tripRequest.update({
      where: { id: passenger.requestId },
      data:  { status: "CANCELLED" },
    }),
    prisma.trip.update({
      where: { id: params.id },
      data:  { seatsFilled: { decrement: passenger.seats } },
    }),
  ]);

  return ok({ cancelled: true });
}
