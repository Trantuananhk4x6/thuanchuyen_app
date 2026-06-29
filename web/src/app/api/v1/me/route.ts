import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findUserById, updateUser } from "@/repositories/user.repository";
import { UpdateProfileSchema } from "@/validators/auth.validator";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const user = await findUserById(auth.payload.userId);
  if (!user) return Errors.notFound("Tài khoản không tồn tại");

  return ok({ user });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const user = await updateUser(auth.payload.userId, parsed.data);
  return ok({ user });
}
