"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult, Post } from "@/types";

export async function createPost(
  formData: FormData
): Promise<ActionResult<Post>> {
  const title = formData.get("title")?.toString().trim();
  const content = formData.get("content")?.toString().trim() ?? null;
  const authorId = Number(formData.get("authorId"));

  if (!title || !authorId) {
    return { ok: false, error: "Title and authorId are required" };
  }

  try {
    const post = await prisma.post.create({
      data: { title, content, authorId },
    });
    return { ok: true, data: post };
  } catch (err) {
    console.error("createPost error:", err);
    return { ok: false, error: "Failed to create post" };
  }
}

export async function getPosts(): Promise<ActionResult<Post[]>> {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { ok: true, data: posts };
  } catch (err) {
    console.error("getPosts error:", err);
    return { ok: false, error: "Failed to fetch posts" };
  }
}

export async function deletePost(id: number): Promise<ActionResult> {
  try {
    await prisma.post.delete({ where: { id } });
    return { ok: true };
  } catch (err) {
    console.error("deletePost error:", err);
    return { ok: false, error: "Failed to delete post" };
  }
}
