import { NextRequest } from "next/server";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "CUSTOMER");
  if ("error" in auth) return auth.error;

  const userId = auth.payload.userId;
  const now = new Date();

  try {
    const vouchers = await prisma.voucher.findMany({
      where: {
        status: "ACTIVE",
        startsAt: { lte: now },
        expiresAt: { gte: now },
        OR: [
          { targetRole: null },
          { targetRole: "CUSTOMER" },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const voucherIds = vouchers.map(v => v.id);
    const usages = await prisma.voucherUsage.groupBy({
      by: ["voucherId"],
      where: { voucherId: { in: voucherIds }, userId },
      _count: { id: true },
    });

    const usageMap = new Map(usages.map(u => [u.voucherId, u._count.id]));

    const available = vouchers.filter(v => {
      const used = usageMap.get(v.id) ?? 0;
      const totalExhausted = v.usageLimit !== null && v.usedCount >= v.usageLimit;
      const userExhausted = used >= v.userLimit;
      return !totalExhausted && !userExhausted;
    });

    return ok({ vouchers: available });
  } catch {
    return ok({ vouchers: [] });
  }
}
