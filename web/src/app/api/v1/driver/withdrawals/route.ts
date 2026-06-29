import { NextRequest } from "next/server";
import { created, ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { WithdrawalSchema } from "@/validators/driver.validator";
import { findDriverByUserId } from "@/repositories/driver.repository";
import {
  createWithdrawal,
  listWithdrawals,
  ensureWallet,
  deductWithdrawable,
} from "@/repositories/wallet.repository";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound();

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const [items, total] = await listWithdrawals({
    driverProfileId: driver.id,
    status,
    page: 1,
    limit: 50,
  });

  return ok({ items, total });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.notFound();

  const body = await req.json().catch(() => null);
  const parsed = WithdrawalSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const wallet = await ensureWallet(driver.id);
  if (wallet.withdrawableBalance < parsed.data.amount) {
    return Errors.conflict("Số dư không đủ");
  }

  await deductWithdrawable(wallet.id, parsed.data.amount, "Yêu cầu rút tiền");
  const withdrawal = await createWithdrawal({
    driverProfileId: driver.id,
    ...parsed.data,
  });

  return created({ withdrawalRequest: withdrawal });
}
