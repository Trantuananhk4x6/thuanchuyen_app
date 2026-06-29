import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit    = Math.min(Number(searchParams.get("limit") ?? "6") || 6, 20);
    const category = searchParams.get("category") ?? undefined;

    const posts = await prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        ...(category ? { category } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true, slug: true, title: true, summary: true,
        coverImage: true, category: true, tags: true,
        readTime: true, viewCount: true, publishedAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: { posts } },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    console.error("[public/blog]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: String(err) } },
      { status: 500 },
    );
  }
}
