import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createShopOrder } from "@/lib/shop-order";
import { QUOTA_PACKAGES } from "@/lib/bandelbanget";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  if (!params.token || params.token.length < 16) {
    return NextResponse.json({ ok: false, error: "Token tidak valid" }, { status: 400 });
  }

  let body: { productId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }

  const productId = Number(body.productId);
  if (!Number.isInteger(productId) || productId < 1) {
    return NextResponse.json({ ok: false, error: "Produk tidak valid" }, { status: 400 });
  }

  // Cek produk exists & active & external
  const product = await prisma.token.findFirst({
    where: { id: productId, active: true, stockMode: "external" },
    select: { sku: true, model: true },
  });
  if (!product) {
    return NextResponse.json({ ok: false, error: "Produk tidak tersedia" }, { status: 404 });
  }

  // Cek saldo reseller cukup
  const code = (product.sku || product.model || "").toUpperCase();
  const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
  if (!pack) {
    return NextResponse.json({ ok: false, error: "Paket tidak valid" }, { status: 400 });
  }

  // Create order dengan buyerQuotaToken = member token
  const result = await createShopOrder({
    tokenId: productId,
    qty: 1,
    buyerQuotaToken: params.token,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    invoice: result.invoice,
    amount: result.amount,
    qrisPayload: result.qrisPayload,
    expiresAt: result.expiresAt,
    ttlMinutes: result.ttlMinutes,
    uniqueCode: result.uniqueCode,
    unitPrice: result.unitPrice,
  });
}
