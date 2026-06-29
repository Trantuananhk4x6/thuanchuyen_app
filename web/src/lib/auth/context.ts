import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "./options";
import { Errors } from "@/lib/api/response";
import type { AuthTokenPayload } from "@/types/api";

type AuthResult =
  | { payload: AuthTokenPayload }
  | { error: ReturnType<typeof Errors.unauthorized> };

export async function getAuthContext(_req?: NextRequest): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: Errors.unauthorized() };

  return {
    payload: {
      userId: session.user.id,
      role: (session.user as { role?: string }).role ?? "CUSTOMER",
    },
  };
}

export async function requireAuth(
  _req?: NextRequest,
  requiredRole?: string,
): Promise<AuthResult> {
  const result = await getAuthContext(_req);
  if ("error" in result) return result;

  if (requiredRole && result.payload.role !== requiredRole) {
    return { error: Errors.forbidden() };
  }
  return result;
}
