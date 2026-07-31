"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function parse(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const active = formData.get("active") === "on" || formData.get("active") === "true";
  if (title.length < 3 || title.length > 120) return { error: "Judul harus 3-120 karakter" } as const;
  if (content.length < 3 || content.length > 5000) return { error: "Isi berita harus 3-5000 karakter" } as const;
  return { title, content, active };
}

export async function createNews(formData: FormData) {
  requireAdmin();
  const data = parse(formData);
  if ("error" in data) return { ok: false, error: data.error };
  try {
    await prisma.news.create({ data });
    revalidatePath("/dashboard/news");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal membuat berita" };
  }
}

export async function updateNews(id: number, formData: FormData) {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID berita tidak valid" };
  const data = parse(formData);
  if ("error" in data) return { ok: false, error: data.error };
  try {
    await prisma.news.update({ where: { id }, data });
    revalidatePath("/dashboard/news");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal memperbarui berita" };
  }
}

export async function toggleNews(id: number, active: boolean) {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID berita tidak valid" };
  try {
    await prisma.news.update({ where: { id }, data: { active } });
    revalidatePath("/dashboard/news");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal mengubah status berita" };
  }
}

export async function deleteNews(id: number) {
  requireAdmin();
  if (!Number.isInteger(id) || id < 1) return { ok: false, error: "ID berita tidak valid" };
  try {
    await prisma.news.delete({ where: { id } });
    revalidatePath("/dashboard/news");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menghapus berita" };
  }
}
