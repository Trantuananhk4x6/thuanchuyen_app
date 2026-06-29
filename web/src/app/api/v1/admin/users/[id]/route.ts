import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findUserById, updateUser } from "@/repositories/user.repository";
import { z } from "zod";

const PatchUserSchema = z.object({
  isBlocked: z.boolean().optional(),
  fullName: z.string().min(2).max(100).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = PatchUserSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const user = await findUserById(params.id);
  if (!user) return Errors.notFound();

  const updated = await updateUser(params.id, parsed.data);
  return ok({ user: updated });
}
