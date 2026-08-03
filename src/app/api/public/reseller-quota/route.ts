import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchResellerKeys } from "@/lib/bandelbanget";

export const dynamic = "force-dynamic";

export async function GET() {
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
    return NextResponse.json({ ok: true, quota });
  } catch {
    return NextResponse.json({ ok: false, quota: 0 });
  }
}
