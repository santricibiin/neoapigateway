import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = "/root/neoapigateway/uploads";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

export async function POST(req: Request) {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("logo") as File | null;
  if (!file) {
    return NextResponse.json({ ok: false, error: "File tidak ditemukan" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, error: "Format tidak didukung (PNG, JPG, GIF, WebP, SVG)" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ ok: false, error: "Ukuran maksimal 5MB" }, { status: 400 });
  }

  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Hapus logo lama
  const existing = await prisma.setting.findUnique({ where: { id: 1 }, select: { logoPath: true } });
  if (existing?.logoPath && existsSync(existing.logoPath)) {
    try { unlinkSync(existing.logoPath); } catch {}
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const fileName = `logo-${Date.now()}.${ext}`;
  const filePath = join(UPLOAD_DIR, fileName);

  const bytes = await file.arrayBuffer();
  writeFileSync(filePath, Buffer.from(bytes));

  await prisma.setting.upsert({
    where: { id: 1 },
    update: { logoPath: filePath },
    create: { id: 1, logoPath: filePath },
  });

  return NextResponse.json({ ok: true, logoUrl: "/api/brand/logo" });
}

export async function DELETE() {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.setting.findUnique({ where: { id: 1 }, select: { logoPath: true } });
  if (existing?.logoPath && existsSync(existing.logoPath)) {
    try { unlinkSync(existing.logoPath); } catch {}
  }

  await prisma.setting.upsert({
    where: { id: 1 },
    update: { logoPath: null },
    create: { id: 1, logoPath: null },
  });

  return NextResponse.json({ ok: true });
}
