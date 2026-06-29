import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { updateUser } from "@/repositories/user.repository";
import { SwitchRoleSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = SwitchRoleSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const user = await updateUser(auth.payload.userId, { role: parsed.data.role });
  return ok({ user });
}
