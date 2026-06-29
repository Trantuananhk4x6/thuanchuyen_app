import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const [
    totalUsers,
    totalDrivers,
    pendingKyc,
    totalTrips,
    activeTrips,
    pendingWithdrawals,
    openReports,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.driverProfile.count(),
    prisma.driverProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.trip.count(),
    prisma.trip.count({ where: { status: { in: ["ACTIVE", "ONGOING"] } } }),
    prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "OPEN" } }),
  ]);

  return ok({
    totalUsers,
    totalDrivers,
    pendingKyc,
    totalTrips,
    activeTrips,
    pendingWithdrawals,
    openReports,
  });
}
