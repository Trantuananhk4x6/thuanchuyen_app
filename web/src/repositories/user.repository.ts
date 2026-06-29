import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

// ─── Read ─────────────────────────────────────────────────────────────────────

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { driverProfile: true },
  });
}

export function findUserByPhone(phone: string) {
  return prisma.user.findUnique({ where: { phone } });
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

export function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data });
}

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.refreshToken.create({ data });
}

export function findRefreshToken(tokenHash: string) {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

export function deleteRefreshToken(id: string) {
  return prisma.refreshToken.delete({ where: { id } });
}

export function deleteAllUserRefreshTokens(userId: string) {
  return prisma.refreshToken.deleteMany({ where: { userId } });
}

// ─── OTP ──────────────────────────────────────────────────────────────────────

export function createOtp(data: {
  phone: string;
  codeHash: string;
  expiresAt: Date;
}) {
  return prisma.otpRecord.create({ data });
}

export function findUnusedOtp(id: string) {
  return prisma.otpRecord.findFirst({
    where: { id, used: false, expiresAt: { gt: new Date() } },
  });
}

export function markOtpUsed(id: string) {
  return prisma.otpRecord.update({ where: { id }, data: { used: true } });
}

export function incrementOtpAttempts(id: string) {
  return prisma.otpRecord.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  });
}

export function countRecentOtps(phone: string, since: Date) {
  return prisma.otpRecord.count({
    where: { phone, createdAt: { gte: since } },
  });
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export function upsertDevice(userId: string, platform: string, fcmToken: string) {
  return prisma.device.upsert({
    where: { userId_platform: { userId, platform } },
    create: { userId, platform, fcmToken },
    update: { fcmToken },
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function listUsers(params: {
  page: number;
  limit: number;
  status?: string;
}) {
  const skip = (params.page - 1) * params.limit;
  const where: Prisma.UserWhereInput = {};
  if (params.status === "blocked") where.isBlocked = true;

  return prisma.$transaction([
    prisma.user.findMany({ where, skip, take: params.limit, orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where }),
  ]);
}
