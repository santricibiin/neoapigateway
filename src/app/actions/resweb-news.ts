"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getResWebSession } from "@/lib/resweb-auth";

function parse(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const active = formData.get("active") === "on";
  if (title.length < 3 || title.length > 120) return { error: "Judul harus 3-120 karakter" } as const;
  if (content.length < 3 || content.length > 5000) return { error: "Isi berita harus 3-5000 karakter" } as const;
  return { title, content, active };
}

export async function saveResWebNews(id: number | null, formData: FormData) {
  const session = getResWebSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  const data = parse(formData);
  if ("error" in data) return { ok: false, error: data.error };
  try {
    if (id) {
      const result = await prisma.resellerWebNews.updateMany({ where: { id, resellerId: session.id }, data });
      if (!result.count) return { ok: false, error: "Berita tidak ditemukan" };
    } else {
      await prisma.resellerWebNews.create({ data: { ...data, resellerId: session.id } });
    }
    revalidatePath("/res/news");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan berita" };
  }
}

export async function deleteResWebNews(id: number) {
  const session = getResWebSession();
  if (!session) return { ok: false, error: "Unauthorized" };
  const result = await prisma.resellerWebNews.deleteMany({ where: { id, resellerId: session.id } });
  if (!result.count) return { ok: false, error: "Berita tidak ditemukan" };
  revalidatePath("/res/news");
  return { ok: true };
}
