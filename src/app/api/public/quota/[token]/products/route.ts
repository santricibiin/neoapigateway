import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchResellerKeys, QUOTA_PACKAGES } from "@/lib/bandelbanget";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  if (!params.token || params.token.length < 16) {
    return NextResponse.json({ ok: false, error: "Token tidak valid" }, { status: 400 });
  }

  const products = await prisma.token.findMany({
    where: { active: true, stockMode: "external" },
    select: { id: true, name: true, sku: true, model: true, price: true, description: true },
    orderBy: { price: "asc" },
  });

  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { secretKey: true },
  });

  let resellerQuota: number | null = null;
  if (setting?.secretKey) {
    try {
      const result = await fetchResellerKeys(setting.secretKey);
      resellerQuota = Number(result.resellerQuota ?? 0);
      console.log("[products] resellerQuota:", resellerQuota);
    } catch (e) {
      console.error("[products] gagal fetch reseller keys:", e instanceof Error ? e.message : e);
    }
  }

  const items = products
    .map((p) => {
      const code = (p.sku || p.model || "").toUpperCase();
      const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
      if (!pack) return null;
      return {
        id: p.id,
        name: p.name,
        sku: code,
        price: Number(p.price),
        tokens: pack.tokens,
        validDays: pack.validDays,
        affordable: resellerQuota === null ? true : pack.tokens <= resellerQuota,
      };
    })
    .filter(Boolean) as Array<{
      id: number;
      name: string;
      sku: string;
      price: number;
      tokens: number;
      validDays: number;
      affordable: boolean;
    }>;

  return NextResponse.json({
    ok: true,
    products: items,
  });
}
