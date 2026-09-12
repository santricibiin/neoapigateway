import { prisma } from "@/lib/prisma";
import {
  fetchBinancePayIncoming,
  fetchUsdtDeposits,
  idrToUsdtCents,
  USDT_NETWORKS,
  type UsdtNetwork,
} from "@/lib/binance";
import { fulfillOrder } from "@/lib/payment-matcher";

export type BinanceConfig = {
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  uid: string;
  addresses: Partial<Record<UsdtNetwork, string>>;
  rate: number;
};

export async function getBinanceConfig(): Promise<BinanceConfig | null> {
  const s = await prisma.setting.findUnique({
    where: { id: 1 },
    select: {
      binanceEnabled: true,
      binanceApiKey: true,
      binanceApiSecret: true,
      binanceUid: true,
      binanceUsdtAddresses: true,
      binanceUsdtRate: true,
    },
  });
  if (!s?.binanceEnabled || !s.binanceApiKey || !s.binanceApiSecret) return null;
  let addresses: Partial<Record<UsdtNetwork, string>> = {};
  try {
    addresses = JSON.parse(s.binanceUsdtAddresses || "{}");
  } catch {
    addresses = {};
  }
  return {
    enabled: true,
    apiKey: s.binanceApiKey,
    apiSecret: s.binanceApiSecret,
    uid: (s.binanceUid || "").trim(),
    addresses,
    rate: s.binanceUsdtRate || 16000,
  };
}

/** Metode pembayaran Binance yang tersedia (binancepay butuh UID, usdt butuh address). */
export async function availableBinanceMethods(): Promise<{
  binancepay: boolean;
  usdt: UsdtNetwork[];
  rate: number;
}> {
  const cfg = await getBinanceConfig();
  if (!cfg) return { binancepay: false, usdt: [], rate: 0 };
  return {
    binancepay: Boolean(cfg.uid),
    usdt: USDT_NETWORKS.filter((n) => Boolean(cfg.addresses[n]?.trim())),
    rate: cfg.rate,
  };
}

/**
 * Hitung nominal USDT cents unik untuk order (anti tabrakan dengan pending lain).
 * Kode unik: maks 50% nominal (min 9, max 499 cents).
 */
export async function uniqueUsdtAmountCents(baseCents: number): Promise<number | null> {
  if (baseCents < 10) return null;
  const uniqueMax = Math.max(9, Math.min(499, Math.floor(baseCents / 2)));
  for (let i = 0; i < 80; i++) {
    const code = Math.floor(Math.random() * uniqueMax) + 1;
    const candidate = baseCents + code;
    const clash = await prisma.paymentOrder.findFirst({
      where: {
        status: "pending",
        currency: "usdt",
        amount: candidate,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  return null;
}

/** IDR → USDT cents dasar (tanpa kode unik). */
export function baseUsdtCents(idrAmount: number, rate: number): number {
  return idrToUsdtCents(idrAmount, rate);
}

/** QR content: UID polos (binancepay) atau address deposit (usdt). */
export function binanceQrContent(method: "binancepay" | "usdt", network: UsdtNetwork | null, cfg: BinanceConfig): string | null {
  if (method === "binancepay") return cfg.uid || null;
  return (network && cfg.addresses[network]?.trim()) || null;
}

/**
 * Poll transaksi Binance masuk → match order USDT pending → claim → fulfill.
 * Dipanggil dari /api/payment/status (poller UI) — guard interval 15s biar hemat rate limit.
 */
let lastPollMs = 0;
let polling = false;
const POLL_INTERVAL_MS = 15_000;

export async function pollBinancePayments(): Promise<void> {
  if (polling) return;
  if (Date.now() - lastPollMs < POLL_INTERVAL_MS) return;
  lastPollMs = Date.now();
  polling = true;
  try {
    const cfg = await getBinanceConfig();
    if (!cfg) return;

    const graceCutoff = new Date(Date.now() - 10 * 60 * 1000);
    // Termasuk order pending/expired yang masih dalam grace (deposit bisa telat
    // confirmed di blockchain). pending yang belum di-expire pun ikut (expiresAt
    // bisa sudah lewat tapi status masih pending sampai grace habis).
    const pending = await prisma.paymentOrder.findMany({
      where: {
        currency: "usdt",
        status: { in: ["pending", "expired"] },
        expiresAt: { gte: graceCutoff },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    if (!pending.length) return;

    const sinceMs = Date.now() - 30 * 60 * 1000;
    const incoming = [
      ...(await fetchBinancePayIncoming(cfg.apiKey, cfg.apiSecret, sinceMs, cfg.uid).catch((e) => {
        console.error("[binance] pay/transactions:", e instanceof Error ? e.message : e);
        return [];
      })),
      ...(await fetchUsdtDeposits(cfg.apiKey, cfg.apiSecret, sinceMs).catch((e) => {
        console.error("[binance] deposit/hisrec:", e instanceof Error ? e.message : e);
        return [];
      })),
    ];

    for (const tx of incoming) {
      // Dedup via PaymentEvent.eventKey
      const eventKey = `binance:${tx.externalId}`;
      const event = await prisma.paymentEvent.upsert({
        where: { eventKey },
        create: {
          eventKey,
          provider: tx.source === "binancepay" ? "binance.pay" : "binance.deposit",
          pkg: tx.source === "binancepay" ? "binance.pay" : "binance.deposit",
          name: tx.source === "binancepay" ? "Binance Pay" : `USDT ${tx.network}`,
          text: `${(tx.amountCents / 100).toFixed(2)} USDT via ${tx.source}`,
          amount: tx.amountCents,
          raw: JSON.stringify(tx.raw ?? {}),
        },
        update: {},
      });
      if (event.matched) continue;

      const order = pending.find(
        (o) => o.amount === tx.amountCents && tx.time >= o.createdAt.getTime() - 2000
      );
      if (!order) continue;

      // Claim atomik pending/expired → processing (pola claimPaymentEvent)
      const claimed = await prisma.$transaction(async (tx2) => {
        const updated = await tx2.paymentOrder.updateMany({
          where: { id: order.id, status: { in: ["pending", "expired"] }, paymentEventId: null },
          data: { status: "processing", paymentEventId: event.id, paidAt: new Date() },
        });
        if (!updated.count) return false;
        await tx2.paymentEvent.update({ where: { id: event.id }, data: { matched: true } });
        return true;
      });
      if (!claimed) continue;

      console.log("[binance] matched", order.invoice, `${(tx.amountCents / 100).toFixed(2)} USDT`, tx.source);
      await fulfillOrder(order.id);
    }
  } catch (e) {
    console.error("[binance] poll error:", e instanceof Error ? e.message : e);
  } finally {
    polling = false;
  }
}
