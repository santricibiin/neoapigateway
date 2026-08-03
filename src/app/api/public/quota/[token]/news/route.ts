import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const rawPage = Number(new URL(request.url).searchParams.get("page") || 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const member = await prisma.member.findUnique({ where: { secretToken: params.token }, select: { resellerId: true } });
  if (!member) return NextResponse.json({ error: "Member tidak ditemukan" }, { status: 404 });
  const where = { resellerId: member.resellerId, active: true };
  const [items, total] = await prisma.$transaction([
    prisma.resellerWebNews.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 5, take: 5, select: { id: true, title: true, content: true, createdAt: true, updatedAt: true } }),
    prisma.resellerWebNews.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / 5));
  return NextResponse.json({ items, page: Math.min(page, totalPages), pageSize: 5, total, totalPages });
}
