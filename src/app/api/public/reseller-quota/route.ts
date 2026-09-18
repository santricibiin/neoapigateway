import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchResellerKeys } from "@/lib/bandelbanget";

export const dynamic = "force-dynamic";

// Cache 60 detik: endpoint ini dipanggil halaman publik /products tiap load,
// dan tiap hit tanpa cache memicu call upstream. Dengan cache, spam publik
// maksimal 1 call upstream per menit — tidak bisa dipakai menghantam provider.
// ponytail: single-process; multi-instance → Redis.
const CACHE_TTL_MS = 60_000;
let cache: { at: number; payload: { ok: boolean; quota: number } } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.payload);
  }
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { secretKey: true },
  });

  if (!setting?.secretKey) {
    return NextResponse.json({ ok: false, quota: 0 });
  }

  try {
    const result = await fetchResellerKeys(setting.secretKey);
    const quota = Number(result.resellerQuota ?? 0);
    cache = { at: Date.now(), payload: { ok: true, quota } };
    return NextResponse.json(cache.payload);
  } catch {
    return NextResponse.json({ ok: false, quota: 0 });
  }
}
