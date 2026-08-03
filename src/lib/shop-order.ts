import { prisma } from "@/lib/prisma";
import { qrisStaticToDynamic } from "@/lib/qris";
import { QUOTA_PACKAGES } from "@/lib/bandelbanget";

export function invoiceCode() {
  return `INV${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export function providerLabel(p: string) {
  if (p === "dana") return "DANA";
  if (p === "nobu") return "Nobu/Neobank";
  return p;
}

export type CreateShopOrderResult =
  | {
      ok: true;
      invoice: string;
      amount: number;
      qty: number;
      unitPrice: number;
      productName: string;
      productSku: string | null;
      productId: number;
      qrisPayload: string;
      provider: string;
      expiresAt: Date;
      ttlMinutes: number;
      uniqueCode: number;
    }
  | { ok: false; error: string };

export async function createShopOrder(opts: {
  tokenId: number;
  qty?: number;
  phone?: string;
  buyerQuotaToken?: string;
}): Promise<CreateShopOrderResult> {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!setting || setting.qrisProvider === "none" || !setting.qrisStatic) {
    return { ok: false, error: "Pembayaran QRIS belum aktif. Hubungi admin." };
  }

  const product = await prisma.token.findUnique({
    where: { id: opts.tokenId, active: true },
    include: { category: true },
  });
  if (!product) return { ok: false, error: "Produk tidak ditemukan." };

  const stockMode = product.stockMode as "counted" | "external";
  if (stockMode === "counted" && product.stock < 1) {
    return { ok: false, error: "Stok habis." };
  };
  if (stockMode === "external") {
    const code = (product.sku || product.model || "").toUpperCase();
    if (!QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES]) {
      return { ok: false, error: `Kode produk ${code} tidak mendukung pembelian otomatis.` };
    }
    if (!setting.secretKey) {
      return { ok: false, error: "Secret Key BandelBanget belum diatur untuk produk external." };
    }
  }
  const safeQty = Math.max(1, Math.min(opts.qty ?? 1, stockMode === "counted" ? product.stock : 999));

  const unitPrice = Number(product.price);
  const unitCost = Number(product.costPrice);
  const base = unitPrice * safeQty;

  let amount = base;
  let uniqueCode = 0;

  if (setting.uniqueCodeEnabled) {
    for (let i = 0; i < 80; i++) {
      const unik = Math.floor(Math.random() * 999) + 1;
      const candidate = base + unik;
      const clash = await prisma.paymentOrder.findFirst({
        where: {
          status: "pending",
          amount: candidate,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!clash) {
        amount = candidate;
        uniqueCode = unik;
        break;
      }
    }
    if (uniqueCode === 0) {
      return { ok: false, error: "Nominal pembayaran sedang penuh. Coba lagi." };
    }
  }

  let qrisPayload: string;
  try {
    qrisPayload = qrisStaticToDynamic(setting.qrisStatic, { amount });
  } catch {
    return { ok: false, error: "QRIS statis tidak valid. Hubungi admin." };
  }

  const invoice = invoiceCode();
  const ttlMinutes = Math.max(1, Math.min(120, setting.qrisTtlMinutes ?? 5));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.paymentOrder.create({
    data: {
      invoice,
      status: "pending",
      amount,
      qty: safeQty,
      unitPrice,
      unitCost,
      productName: product.name,
      productSku: product.sku,
      buyerPhone: opts.phone || null,
      buyerQuotaToken: opts.buyerQuotaToken || null,
      qrisProvider: setting.qrisProvider,
      qrisPayload,
      expiresAt,
      tokenId: product.id,
    },
  });

  return {
    ok: true,
    invoice,
    amount,
    qty: safeQty,
    unitPrice,
    productName: product.name,
    productSku: product.sku,
    productId: product.id,
    qrisPayload,
    provider: providerLabel(setting.qrisProvider),
    expiresAt,
    ttlMinutes,
    uniqueCode,
  };
}

export async function getOrderByInvoice(invoice: string) {
  return prisma.paymentOrder.findUnique({
    where: { invoice },
    include: { paymentEvent: true },
  });
}

export async function cancelShopOrder(invoice: string) {
  const order = await prisma.paymentOrder.findFirst({
    where: { invoice, status: "pending" },
  });
  if (!order) return { ok: false as const, error: "Transaksi tidak ditemukan / sudah diproses" };
  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { status: "expired" },
  });
  return { ok: true as const };
}

/** Tandai semua PaymentOrder pending yang lewat expiresAt sebagai expired. */
export async function expireOverdueOrders(): Promise<number> {
  const result = await prisma.paymentOrder.updateMany({
    where: { status: "pending", expiresAt: { lte: new Date() } },
    data: { status: "expired" },
  });
  return result.count;
}
