import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

// ─── Pricing Config ───────────────────────────────────────────────────────────

export function getActivePricing() {
  return prisma.pricingConfig.findFirst({ where: { isActive: true } });
}

export function updatePricing(id: string, data: Prisma.PricingConfigUpdateInput) {
  return prisma.pricingConfig.update({ where: { id }, data });
}

export function createPricing(data: Prisma.PricingConfigCreateInput) {
  return prisma.pricingConfig.create({ data });
}

// ─── Area Pricing ─────────────────────────────────────────────────────────────

export function listAreaPricing() {
  return prisma.areaPricing.findMany({ orderBy: [{ originProvince: "asc" }, { destProvince: "asc" }] });
}

export function findAreaPricing(originProvince: string, destProvince: string) {
  return prisma.areaPricing.findFirst({
    where: { originProvince, destProvince, active: true },
  });
}

export function createAreaPricing(data: Prisma.AreaPricingCreateInput) {
  return prisma.areaPricing.create({ data });
}

export function updateAreaPricing(id: string, data: Prisma.AreaPricingUpdateInput) {
  return prisma.areaPricing.update({ where: { id }, data });
}

// ─── Cargo Config ─────────────────────────────────────────────────────────────

export function getCargoConfig() {
  return prisma.cargoConfig.findFirst();
}

export function upsertCargoConfig(data: Prisma.CargoConfigUpdateInput) {
  return prisma.cargoConfig.upsert({
    where: { id: "singleton" },
    update: data,
    create: {
      id: "singleton",
      enabled: true,
      maxWeightKg: 200,
      pricePerKg: 0,
      ...data,
    } as Prisma.CargoConfigCreateInput,
  });
}

// ─── Rating ───────────────────────────────────────────────────────────────────

export function createRating(data: {
  tripId: string;
  giverId: string;
  receiverId: string;
  stars: number;
  comment?: string;
}) {
  return prisma.rating.create({ data });
}

export function findRatingsByReceiver(receiverId: string) {
  return prisma.rating.findMany({
    where: { receiverId },
    include: { giver: { select: { fullName: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function recalcDriverRating(driverUserId: string) {
  const agg = await prisma.rating.aggregate({
    where: { receiverId: driverUserId },
    _avg: { stars: true },
    _count: true,
  });
  return {
    avg: agg._avg.stars ?? 5,
    count: agg._count,
  };
}

// ─── Report ───────────────────────────────────────────────────────────────────

export function createReport(data: Prisma.ReportCreateInput) {
  return prisma.report.create({ data });
}

export function listReports(params: {
  status?: string;
  page: number;
  limit: number;
}) {
  const skip = (params.page - 1) * params.limit;
  return prisma.$transaction([
    prisma.report.findMany({
      where: params.status ? { status: params.status as never } : {},
      include: {
        reporter: { select: { fullName: true, phone: true } },
        reportedUser: { select: { fullName: true, phone: true } },
      },
      skip,
      take: params.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.report.count({
      where: params.status ? { status: params.status as never } : {},
    }),
  ]);
}

export function updateReport(
  id: string,
  data: { status: string; adminNote?: string; resolvedAt?: Date },
) {
  return prisma.report.update({ where: { id }, data: data as never });
}
