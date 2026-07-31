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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, authorId } = body as {
      title: string;
      content?: string;
      authorId: number;
    };

    if (!title || !authorId) {
      return NextResponse.json(
        { ok: false, error: "title and authorId are required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: { title, content: content ?? null, authorId },
    });
    return NextResponse.json({ ok: true, data: post }, { status: 201 });
  } catch (err) {
    console.error("POST /api/posts error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to create post" },
      { status: 500 }
    );
  }
}
