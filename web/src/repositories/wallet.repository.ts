import { prisma } from "@/lib/db/prisma";
import type { WalletTxType } from "@prisma/client";

// ─── Wallet ───────────────────────────────────────────────────────────────────

export function findWalletByDriver(driverProfileId: string) {
  return prisma.driverWallet.findUnique({
    where: { driverProfileId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

export function ensureWallet(driverProfileId: string) {
  return prisma.driverWallet.upsert({
    where: { driverProfileId },
    create: { driverProfileId },
    update: {},
  });
}

export function creditPending(walletId: string, amount: number, tripId: string) {
  return prisma.$transaction([
    prisma.driverWallet.update({
      where: { id: walletId },
      data: { pendingBalance: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId,
        amount,
        type: "TRIP_CREDIT",
        description: `Thu nhập chuyến ${tripId}`,
        tripId,
        availableAt: new Date(Date.now() + holdDaysMs()),
      },
    }),
  ]);
}

export async function releaseMaturedTransactions() {
  const now = new Date();
  const pendingTx = await prisma.walletTransaction.findMany({
    where: { type: "TRIP_CREDIT", availableAt: { lte: now }, releasedAt: null },
    include: { wallet: true },
  });

  for (const tx of pendingTx) {
    await prisma.$transaction([
      prisma.driverWallet.update({
        where: { id: tx.walletId },
        data: {
          pendingBalance: { decrement: tx.amount },
          withdrawableBalance: { increment: tx.amount },
        },
      }),
      prisma.walletTransaction.update({
        where: { id: tx.id },
        data: { releasedAt: now, type: "RELEASE" },
      }),
    ]);
  }

  return pendingTx.length;
}

function holdDaysMs(): number {
  return (Number(process.env.WALLET_HOLD_DAYS ?? 3)) * 24 * 60 * 60 * 1000;
}

// ─── Withdrawal ───────────────────────────────────────────────────────────────

export function createWithdrawal(data: {
  driverProfileId: string;
  amount: number;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
}) {
  return prisma.withdrawalRequest.create({ data });
}

export function findWithdrawalById(id: string) {
  return prisma.withdrawalRequest.findUnique({ where: { id }, include: { driverProfile: { include: { user: true } } } });
}

export function listWithdrawals(params: {
  driverProfileId?: string;
  status?: string;
  page: number;
  limit: number;
}) {
  const skip = (params.page - 1) * params.limit;
  return prisma.$transaction([
    prisma.withdrawalRequest.findMany({
      where: {
        ...(params.driverProfileId ? { driverProfileId: params.driverProfileId } : {}),
        ...(params.status ? { status: params.status as never } : {}),
      },
      include: { driverProfile: { include: { user: true } } },
      skip,
      take: params.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.withdrawalRequest.count({
      where: {
        ...(params.driverProfileId ? { driverProfileId: params.driverProfileId } : {}),
        ...(params.status ? { status: params.status as never } : {}),
      },
    }),
  ]);
}

export function updateWithdrawal(
  id: string,
  data: {
    status: "APPROVED" | "REJECTED" | "PROCESSING" | "DONE";
    adminNote?: string;
    processedAt?: Date;
  },
) {
  return prisma.withdrawalRequest.update({ where: { id }, data });
}

export function deductWithdrawable(walletId: string, amount: number, note: string) {
  return prisma.$transaction([
    prisma.driverWallet.update({
      where: { id: walletId },
      data: { withdrawableBalance: { decrement: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId,
        amount: -amount,
        type: "WITHDRAWAL",
        description: note,
      },
    }),
  ]);
}
