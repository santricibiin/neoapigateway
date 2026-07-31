import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fetchResellerKeys } from "@/lib/bandelbanget";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true } });
  if (!setting?.secretKey) return NextResponse.json({ ok: false, error: "Secret Key reseller belum diatur" }, { status: 400 });
  try {
    const result = await fetchResellerKeys(setting.secretKey);
    return NextResponse.json({ ok: true, keys: result.keys });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gagal memuat customer keys" }, { status: 502 });
  }
}
