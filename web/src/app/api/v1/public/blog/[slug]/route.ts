import { NextRequest, NextResponse } from "next/server";
import { Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug, status: "PUBLISHED" },
  });
  if (!post) return Errors.notFound("Bài viết không tồn tại");

  // Increment view count (fire-and-forget)
  prisma.blogPost.update({ where: { slug }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  return NextResponse.json(
    { success: true, data: { post } },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } },
  );
}
