import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, data: posts });
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed" },
    { status: 405 }
  );
}
