import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { RejectWithdrawalSchema } from "@/validators/admin.validator";
import {
  findWithdrawalById,
  updateWithdrawal,
  ensureWallet,
} from "@/repositories/wallet.repository";
import { prisma } from "@/lib/db/prisma";
import { notify } from "@/lib/notifications/notification.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = RejectWithdrawalSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const wr = await findWithdrawalById(params.id);
  if (!wr) return Errors.notFound();
  if (wr.status !== "PENDING") return Errors.conflict("Yêu cầu không ở trạng thái chờ");

  const wallet = await ensureWallet(wr.driverProfileId);

  await prisma.$transaction([
    prisma.driverWallet.update({
      where: { id: wallet.id },
      data: { withdrawableBalance: { increment: wr.amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: wr.amount,
        type: "ADJUSTMENT",
        description: `Hoàn tiền rút: ${parsed.data.note}`,
      },
    }),
  ]);

  const updated = await updateWithdrawal(params.id, {
    status: "REJECTED",
    adminNote: parsed.data.note,
    processedAt: new Date(),
  });

  void notify({
    userId: wr.driverProfile.userId,
    phone: wr.driverProfile.user.phone ?? undefined,
    event: "WITHDRAWAL_REJECTED",
    templateData: { reason: parsed.data.note },
  });

  return ok({ withdrawal: updated });
}
