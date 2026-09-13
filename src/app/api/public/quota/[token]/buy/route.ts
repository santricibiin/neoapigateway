import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createShopOrder } from "@/lib/shop-order";
import { QUOTA_PACKAGES, fetchResellerKeys } from "@/lib/bandelbanget";
import { checkPendingByBuyerToken, MAX_PENDING_ORDERS } from "@/lib/order-limit";
import { availableBinanceMethods } from "@/lib/binance-order";
import type { UsdtNetwork } from "@/lib/binance";

export const dynamic = "force-dynamic";

const USDT_NETWORKS = ["TRC20", "BEP20", "ERC20", "SOL"] as const;

function parseMethod(body: { payMethod?: unknown; network?: unknown }): {
  payMethod: "qris" | "binancepay" | "usdt";
  network: UsdtNetwork | null;
} | { error: string } {
  const raw = body.payMethod;
  if (raw == null || raw === "qris") return { payMethod: "qris", network: null };
  if (raw === "binancepay") return { payMethod: "binancepay", network: null };
  if (raw === "usdt") {
    const net = String(body.network ?? "").toUpperCase();
    if (!(USDT_NETWORKS as readonly string[]).includes(net)) return { error: "Network USDT tidak valid" };
    return { payMethod: "usdt", network: net as UsdtNetwork };
  }
  return { error: "Metode pembayaran tidak valid" };
}

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  if (!params.token || params.token.length < 16) {
    return NextResponse.json({ ok: false, error: "Token tidak valid" }, { status: 400 });
  }

  let body: { productId?: unknown; payMethod?: unknown; network?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
  }

  const method = parseMethod(body);
  if ("error" in method) {
    return NextResponse.json({ ok: false, error: method.error }, { status: 400 });
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

  // Cek paket produk valid
  const code = (product.sku || product.model || "").toUpperCase();
  const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
  if (!pack) {
    return NextResponse.json({ ok: false, error: "Paket tidak valid" }, { status: 400 });
  }

  // Validasi token member ke upstream supaya order tidak dibuat untuk token sampah
  // (bayar QRIS lalu fulfill gagal = uang hilang tanpa refund)
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { secretKey: true },
  });
  if (!setting?.secretKey) {
    return NextResponse.json({ ok: false, error: "Pembelian belum dikonfigurasi" }, { status: 503 });
  }

  // Rate limit server-side: maks 3 order pending per member (buyerQuotaToken).
  if (!(await checkPendingByBuyerToken(params.token))) {
    return NextResponse.json(
      {
        ok: false,
        error: `Anda punya ${MAX_PENDING_ORDERS} pesanan belum dibayar. Selesaikan atau tunggu kedaluwarsa sebelum membuat pesanan baru.`,
      },
      { status: 429 }
    );
  }

  try {
    const keys = await fetchResellerKeys(setting.secretKey);
    const member = keys.keys.find((k) => k.secretToken === params.token);
    if (!member) {
      return NextResponse.json({ ok: false, error: "Token member tidak valid" }, { status: 404 });
    }
    if (typeof keys.resellerQuota === "number" && pack.tokens > keys.resellerQuota) {
      return NextResponse.json(
        { ok: false, error: "Kuota reseller tidak cukup untuk paket ini. Hubungi reseller Anda." },
        { status: 409 }
      );
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Gagal memverifikasi member, coba lagi" }, { status: 502 });
  }

  // Create order dengan buyerQuotaToken = member token
  const result = await createShopOrder({
    tokenId: productId,
    qty: 1,
    buyerQuotaToken: params.token,
    payMethod: method.payMethod,
    network: method.network,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    invoice: result.invoice,
    amount: result.amount,
    currency: result.currency,
    payMethod: result.payMethod,
    network: result.network,
    qrisPayload: result.qrisPayload,
    expiresAt: result.expiresAt,
    ttlMinutes: result.ttlMinutes,
    uniqueCode: result.uniqueCode,
    unitPrice: result.unitPrice,
  });
}
