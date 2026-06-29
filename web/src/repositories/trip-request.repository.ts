import { prisma } from "@/lib/db/prisma";
import type { Prisma, TripRequestStatus } from "@prisma/client";

// ─── Read ─────────────────────────────────────────────────────────────────────

export function findRequestById(id: string) {
  return prisma.tripRequest.findUnique({
    where: { id },
    include: { matches: true, tripPassenger: { include: { trip: true } } },
  });
}

export function findRequestsByCustomer(customerId: string, status?: TripRequestStatus) {
  return prisma.tripRequest.findMany({
    where: { customerId, ...(status ? { status } : {}) },
    include: {
      matches: {
        where: { status: "ACCEPTED" },
        include: { driverProfile: { include: { user: true } } },
      },
      tripPassenger: { select: { tripId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function createTripRequest(data: Prisma.TripRequestCreateInput) {
  return prisma.tripRequest.create({ data });
}

export function updateRequestStatus(id: string, status: TripRequestStatus) {
  return prisma.tripRequest.update({ where: { id }, data: { status } });
}

// ─── Match ────────────────────────────────────────────────────────────────────

export function createMatch(data: Prisma.TripMatchCreateInput) {
  return prisma.tripMatch.create({ data });
}

export function findMatchById(id: string) {
  return prisma.tripMatch.findUnique({
    where: { id },
    include: {
      request: true,
      driverRoute: true,
      driverProfile: { include: { user: true } },
    },
  });
}

export function findOfferedMatchesByDriver(driverProfileId: string) {
  return prisma.tripMatch.findMany({
    where: { driverProfileId, status: "OFFERED", expiresAt: { gt: new Date() } },
    include: { request: true },
    orderBy: { offeredAt: "desc" },
  });
}

export function updateMatchStatus(
  id: string,
  status: "ACCEPTED" | "REJECTED" | "EXPIRED",
) {
  return prisma.tripMatch.update({
    where: { id },
    data: { status, respondedAt: new Date() },
  });
}
