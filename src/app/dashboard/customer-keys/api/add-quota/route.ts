import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { addCustomerQuota, fetchResellerKeys, QUOTA_PACKAGES } from "@/lib/bandelbanget";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  let body: { targetKeyId?: unknown; targetName?: unknown; packageCode?: unknown; addTokens?: unknown; validDays?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON tidak valid" }, { status: 400 });
  }
  const targetKeyId = Number(body.targetKeyId);
  const targetName = String(body.targetName || "").trim();
  const packageCode = String(body.packageCode || "").toUpperCase() as keyof typeof QUOTA_PACKAGES;
  const selectedPackage = QUOTA_PACKAGES[packageCode];
  const addTokens = selectedPackage?.tokens ?? Number(body.addTokens);
  const validDays = selectedPackage?.validDays ?? Number(body.validDays);
  if (!Number.isInteger(targetKeyId) || targetKeyId < 1 || !targetName) {
    return NextResponse.json({ ok: false, error: "Target customer tidak valid" }, { status: 400 });
  }
  if (!Number.isInteger(addTokens) || addTokens < 1 || addTokens > 10_000_000_000) {
    return NextResponse.json({ ok: false, error: "Jumlah token tidak valid" }, { status: 400 });
  }
  if (!Number.isInteger(validDays) || validDays < 1 || validDays > 365) {
    return NextResponse.json({ ok: false, error: "Masa aktif harus 1-365 hari" }, { status: 400 });
  }
  const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true } });
  if (!setting?.secretKey) {
    return NextResponse.json({ ok: false, error: "Secret Key reseller belum diatur" }, { status: 400 });
  }
  try {
    const keys = await fetchResellerKeys(setting.secretKey);
    const target = keys.keys.find((key) => Number(key.id) === targetKeyId);
    if (!target) return NextResponse.json({ ok: false, error: `Customer ID #${targetKeyId} tidak ditemukan` }, { status: 404 });
    if ((target.name || "Tanpa nama").trim() !== targetName) {
      return NextResponse.json({ ok: false, error: "Nama customer berubah. Muat ulang halaman." }, { status: 409 });
    }
    const result = await addCustomerQuota(setting.secretKey, targetKeyId, addTokens, validDays);
    return NextResponse.json({
      ok: true,
      targetKeyId,
      targetName,
      addTokens,
      validDays,
      remainingQuota: result.remainingQuota ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Tambah kuota gagal" },
      { status: 502 }
    );
  }
}
