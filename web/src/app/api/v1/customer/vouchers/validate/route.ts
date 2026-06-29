import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const ValidateSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  orderValue: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "CUSTOMER");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = ValidateSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const { code, orderValue } = parsed.data;
  const userId = auth.payload.userId;
  const now = new Date();

  const voucher = await prisma.voucher.findUnique({ where: { code } });

  if (!voucher) return Errors.notFound("Mã voucher không tồn tại");
  if (voucher.status !== "ACTIVE") return Errors.validation("Voucher đã bị tạm dừng hoặc hết hiệu lực");
  if (now < voucher.startsAt) return Errors.validation("Voucher chưa đến ngày hiệu lực");
  if (now > voucher.expiresAt) return Errors.validation("Voucher đã hết hạn");
  if (voucher.targetRole && voucher.targetRole !== "CUSTOMER") {
    return Errors.validation("Voucher này không áp dụng cho khách hàng");
  }
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    return Errors.validation("Voucher đã hết lượt sử dụng");
  }
  if (orderValue < voucher.minOrderValue) {
    return Errors.validation(
      `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString("vi-VN")}đ để áp dụng voucher này`
    );
  }

  // Check user usage limit
  const userUsage = await prisma.voucherUsage.count({
    where: { voucherId: voucher.id, userId },
  });
  if (userUsage >= voucher.userLimit) {
    return Errors.validation("Bạn đã dùng voucher này đủ số lần cho phép");
  }

  // Calculate discount
  let discount = 0;
  if (voucher.type === "PERCENT") {
    discount = Math.round(orderValue * (voucher.value / 100));
    if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount);
  } else if (voucher.type === "FIXED_AMOUNT") {
    discount = Math.min(voucher.value, orderValue);
  } else if (voucher.type === "FREE_TRIP") {
    discount = orderValue;
  }

  const finalPrice = Math.max(0, orderValue - discount);

  return ok({
    voucher: {
      id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      type: voucher.type,
      value: voucher.value,
    },
    discount,
    finalPrice,
    orderValue,
  });
}
