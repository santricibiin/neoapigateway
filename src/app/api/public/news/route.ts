import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rawPage = Number(new URL(request.url).searchParams.get("page") || 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = 5;
  try {
    const [items, total] = await prisma.$transaction([
      prisma.news.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
      }),
      prisma.news.count({ where: { active: true } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return NextResponse.json({
      items,
      page: Math.min(page, totalPages),
      pageSize,
      total,
      totalPages,
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat berita" }, { status: 500 });
  }
}
