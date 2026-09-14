import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { qrisStaticToDynamic } from "@/lib/qris";
import { QUOTA_PACKAGES, fetchResellerKeys } from "@/lib/bandelbanget";
import { checkPendingByTelegram, MAX_PENDING_ORDERS } from "@/lib/order-limit";
import { getBinanceConfig, uniqueUsdtAmountCents, baseUsdtCents, binanceQrContent } from "@/lib/binance-order";
import { GOPAY2_PROVIDER, gopay2Configured, gopay2CreateQris } from "@/lib/gopay-merchant2";
import type { UsdtNetwork } from "@/lib/binance";

export function invoiceCode() {
  return `INV-${randomBytes(12).toString("hex").toUpperCase()}`;
}

export function providerLabel(p: string) {
  if (p === "dana") return "DANA";
  if (p === "nobu") return "Nobu/Neobank";
  if (p === "gopay") return "GoPay Merchant";
  if (p === GOPAY2_PROVIDER) return "GoPay Merchant 2";
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
      currency: "idr" | "usdt";
      payMethod: "qris" | "binancepay" | "usdt";
      network: UsdtNetwork | null;
    }
  | { ok: false; error: string };

export async function createShopOrder(opts: {
  tokenId: number;
  qty?: number;
  phone?: string;
  buyerQuotaToken?: string;
  payMethod?: "qris" | "binancepay" | "usdt";
  network?: UsdtNetwork | null;
}): Promise<CreateShopOrderResult> {
  const payMethod = opts.payMethod ?? "qris";
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!setting) return { ok: false, error: "Pengaturan belum tersedia." };
  const useGopay2 = setting.qrisProvider === GOPAY2_PROVIDER;
  if (payMethod === "qris" && !useGopay2 && (setting.qrisProvider === "none" || !setting.qrisStatic)) {
    return { ok: false, error: "Pembayaran QRIS belum aktif. Hubungi admin." };
  }
  if (payMethod === "qris" && useGopay2 && !gopay2Configured({ baseUrl: setting.gopay2BaseUrl, apiKey: setting.gopay2ApiKey })) {
    return { ok: false, error: "Gateway GoPay Merchant 2 belum dikonfigurasi. Hubungi admin." };
  }

  const rawQty = opts.qty ?? 1;
  if (!Number.isInteger(rawQty) || rawQty < 1) {
    return { ok: false, error: "Jumlah tidak valid." };
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
      return { ok: false, error: "Secret Key Provider belum diatur untuk produk external." };
    }
    // Cek kuota reseller upstream cukup sebelum membuat order, supaya pembeli
    // tidak membayar paket yang tidak bisa dipenuhi (fulfillment pasti gagal).
    try {
      const keys = await fetchResellerKeys(setting.secretKey);
      const need = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES].tokens * (opts.qty ?? 1);
      if (typeof keys.resellerQuota === "number" && need > keys.resellerQuota) {
        return { ok: false, error: "Stok kuota tidak cukup. Hubungi admin." };
      }
    } catch {
      return { ok: false, error: "Gagal memverifikasi stok kuota, coba lagi." };
    }
  }
  const safeQty = Math.max(1, Math.min(opts.qty ?? 1, stockMode === "counted" ? product.stock : 999));

  const unitPrice = Number(product.price);
  const unitCost = Number(product.costPrice);
  const base = unitPrice * safeQty;

  let amount = base;
  let uniqueCode = 0;
  let currency: "idr" | "usdt" = "idr";
  let qrisPayload = "";
  let provider = "";
  let gopayTrxId: string | null = null;

  if (payMethod === "binancepay" || payMethod === "usdt") {
    // ===== Pembayaran Binance: amount = USDT cents + kode unik =====
    const cfg = await getBinanceConfig();
    if (!cfg) return { ok: false, error: "Pembayaran Binance belum aktif." };
    const qrContent = binanceQrContent(payMethod, opts.network ?? null, cfg);
    if (!qrContent) {
      return {
        ok: false,
        error: payMethod === "binancepay" ? "UID Binance Pay belum diset." : `Alamat USDT ${opts.network} belum diset.`,
      };
    }
    const baseCents = baseUsdtCents(base, cfg.rate);
    if (baseCents < 10) return { ok: false, error: "Nominal terlalu kecil untuk USDT (min 0.10 USDT)." };
    const amountCents = await uniqueUsdtAmountCents(baseCents);
    if (!amountCents) return { ok: false, error: "Nominal pembayaran sedang penuh. Coba lagi." };
    amount = amountCents;
    uniqueCode = amountCents - baseCents;
    currency = "usdt";
    qrisPayload = qrContent;
    provider = payMethod === "binancepay" ? "Binance Pay" : `USDT ${opts.network}`;
  } else {
    // ===== QRIS: amount IDR + kode unik 500–999 =====
    if (!useGopay2 && !setting.qrisStatic) {
      return { ok: false, error: "Pembayaran QRIS belum aktif. Hubungi admin." };
    }
    if (setting.uniqueCodeEnabled) {
      for (let i = 0; i < 80; i++) {
        // 500–999: range unik bot5 (bot4 pakai 001–499) — anti nominal tabrakan antar site yang share 1 QRIS
        const unik = Math.floor(Math.random() * 500) + 500;
        const candidate = base + unik;
        const [shopClash, reswebClash] = await Promise.all([
          prisma.paymentOrder.findFirst({
            where: {
              status: "pending",
              currency: "idr",
              amount: candidate,
              expiresAt: { gt: new Date() },
            },
            select: { id: true },
          }),
          prisma.resellerWebOrder.findFirst({
            where: {
              status: "pending",
              amount: candidate,
              expiresAt: { gt: new Date() },
            },
            select: { id: true },
          }),
        ]);
        if (!shopClash && !reswebClash) {
          amount = candidate;
          uniqueCode = unik;
          break;
        }
      }
      if (uniqueCode === 0) {
        return { ok: false, error: "Nominal pembayaran sedang penuh. Coba lagi." };
      }
    }
    if (useGopay2) {
      try {
        const qris = await gopay2CreateQris(amount, { baseUrl: setting.gopay2BaseUrl, apiKey: setting.gopay2ApiKey });
        qrisPayload = qris.qris_code;
        gopayTrxId = qris.trx_id;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? `Gateway GoPay: ${e.message}` : "Gateway GoPay gagal membuat QRIS." };
      }
    } else {
      try {
        qrisPayload = qrisStaticToDynamic(setting.qrisStatic!, { amount });
      } catch {
        return { ok: false, error: "QRIS statis tidak valid. Hubungi admin." };
      }
    }
    provider = providerLabel(setting.qrisProvider);
  }

  const invoice = invoiceCode();
  // Gateway gopaymerchant2: expired QR fix 5 menit (hardcoded gateway) — TTL diabaikan
  const ttlMinutes = useGopay2 && payMethod === "qris" ? 5 : Math.max(1, Math.min(120, setting.qrisTtlMinutes ?? 5));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.paymentOrder.create({
    data: {
      invoice,
      status: "pending",
      amount,
      currency,
      payMethod,
      usdtRate: currency === "usdt" ? (await getBinanceConfig())?.rate ?? null : null,
      qty: safeQty,
      unitPrice,
      unitCost,
      productName: product.name,
      productSku: product.sku,
      buyerPhone: opts.phone || null,
      buyerQuotaToken: opts.buyerQuotaToken || null,
      qrisProvider: payMethod === "qris" ? setting.qrisProvider : payMethod,
      qrisPayload,
      gopayTrxId,
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
    provider,
    expiresAt,
    ttlMinutes,
    uniqueCode,
    currency,
    payMethod,
    network: opts.network ?? null,
  };
}

export type CreateBotOrderResult =
  | {
      ok: true;
      invoice: string;
      amount: number;
      qty: number;
      unitPrice: number;
      productName: string;
      productCode: string;
      qrisPayload: string;
      provider: string;
      expiresAt: Date;
      ttlMinutes: number;
    }
  | { ok: false; error: string };

export async function createBotOrder(opts: {
  tokenId: number;
  qty: number;
  telegramUserId: string;
  chatId: number;
  detailMessageId?: number;
}): Promise<CreateBotOrderResult> {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!setting || setting.qrisProvider === "none") {
    return { ok: false, error: "Pembayaran QRIS belum aktif. Hubungi admin." };
  }
  const useGopay2 = setting.qrisProvider === GOPAY2_PROVIDER;
  if (useGopay2) {
    if (!gopay2Configured({ baseUrl: setting.gopay2BaseUrl, apiKey: setting.gopay2ApiKey })) {
      return { ok: false, error: "Gateway GoPay Merchant 2 belum dikonfigurasi. Hubungi admin." };
    }
  } else if (!setting.qrisStatic) {
    return { ok: false, error: "Pembayaran QRIS belum aktif. Hubungi admin." };
  }

  // Rate limit server-side: maks 3 order pending per user Telegram.
  if (!(await checkPendingByTelegram(opts.telegramUserId))) {
    return {
      ok: false,
      error: `Anda punya ${MAX_PENDING_ORDERS} pesanan belum dibayar. Selesaikan atau tunggu kedaluwarsa sebelum membuat pesanan baru.`,
    };
  }

  if (!Number.isInteger(opts.qty) || opts.qty < 1) {
    return { ok: false, error: "Jumlah tidak valid." };
  }

  const product = await prisma.token.findUnique({
    where: { id: opts.tokenId, active: true },
    include: { category: true },
  });
  if (!product) return { ok: false, error: "Produk tidak ditemukan." };

  const stockMode = product.stockMode as "counted" | "external";
  if (stockMode === "counted" && product.stock < 1) {
    return { ok: false, error: "Stok habis." };
  }
  if (stockMode === "external") {
    const code = (product.sku || product.model || "").toUpperCase();
    if (!QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES]) {
      return { ok: false, error: `Kode produk ${code} tidak mendukung pembelian otomatis.` };
    }
    if (!setting.secretKey) {
      return { ok: false, error: "Secret Key Provider belum diatur untuk produk external." };
    }
    try {
      const keys = await fetchResellerKeys(setting.secretKey);
      const need = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES].tokens * opts.qty;
      if (typeof keys.resellerQuota === "number" && need > keys.resellerQuota) {
        return { ok: false, error: "Stok kuota tidak cukup. Hubungi admin." };
      }
    } catch {
      return { ok: false, error: "Gagal memverifikasi stok kuota, coba lagi." };
    }
  }

  const safeQty = Math.max(1, Math.min(opts.qty, stockMode === "counted" ? product.stock : 1));
  const unitPrice = Number(product.price);
  const base = unitPrice * safeQty;

  let amount = base;
  let uniqueCode = 0;
  if (setting.uniqueCodeEnabled) {
    for (let i = 0; i < 80; i++) {
      // 500–999: range unik bot5 (bot4 pakai 001–499) — anti nominal tabrakan antar site yang share 1 QRIS
      const unik = Math.floor(Math.random() * 500) + 500;
      const candidate = base + unik;
      const [shopClash, reswebClash] = await Promise.all([
        prisma.paymentOrder.findFirst({
          where: { status: "pending", amount: candidate, expiresAt: { gt: new Date() } },
          select: { id: true },
        }),
        prisma.resellerWebOrder.findFirst({
          where: { status: "pending", amount: candidate, expiresAt: { gt: new Date() } },
          select: { id: true },
        }),
      ]);
      if (!shopClash && !reswebClash) {
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
  let gopayTrxId: string | null = null;
  if (useGopay2) {
    try {
      const qris = await gopay2CreateQris(amount, { baseUrl: setting.gopay2BaseUrl, apiKey: setting.gopay2ApiKey });
      qrisPayload = qris.qris_code;
      gopayTrxId = qris.trx_id;
    } catch (e) {
      return { ok: false, error: e instanceof Error ? `Gateway GoPay: ${e.message}` : "Gateway GoPay gagal membuat QRIS." };
    }
  } else {
    try {
      qrisPayload = qrisStaticToDynamic(setting.qrisStatic!, { amount });
    } catch {
      return { ok: false, error: "QRIS statis tidak valid. Hubungi admin." };
    }
  }

  const invoice = invoiceCode();
  // Gateway gopaymerchant2: expired QR fix 5 menit (hardcoded gateway) — TTL diabaikan
  const ttlMinutes = useGopay2 ? 5 : Math.max(1, Math.min(120, setting.qrisTtlMinutes ?? 5));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.paymentOrder.create({
    data: {
      invoice,
      status: "pending",
      amount,
      qty: safeQty,
      unitPrice,
      unitCost: Number(product.costPrice),
      productName: product.name,
      productSku: product.sku,
      telegramUserId: opts.telegramUserId,
      chatId: String(opts.chatId),
      detailMessageId: opts.detailMessageId ?? null,
      qrisProvider: setting.qrisProvider,
      qrisPayload,
      gopayTrxId,
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
    productCode: product.sku || product.model,
    qrisPayload,
    provider: providerLabel(setting.qrisProvider),
    expiresAt,
    ttlMinutes,
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

/** Tandai semua PaymentOrder pending yang lewat masa berlaku + grace period sebagai expired. */
export async function expireOverdueOrders(): Promise<number> {
  // Grace 10 menit: notifikasi bank bisa telat. Jangan expire tepat di TTL,
  // agar claimPaymentEvent (yang juga pakai grace) tetap bisa menandai order.
  const EXPIRE_GRACE_MS = 10 * 60 * 1000;
  const result = await prisma.paymentOrder.updateMany({
    where: { status: "pending", expiresAt: { lte: new Date(Date.now() - EXPIRE_GRACE_MS) } },
    data: { status: "expired" },
  });
  return result.count;
}
