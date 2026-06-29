import { NextRequest } from "next/server";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "CUSTOMER");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const position = searchParams.get("position") ?? "HOME_TOP";
  const now = new Date();

  try {
    const banners = await prisma.banner.findMany({
      where: {
        position: position as never,
        active: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 10,
    });

    return ok({ banners });
  } catch {
    return ok({ banners: [] });
  }
}
