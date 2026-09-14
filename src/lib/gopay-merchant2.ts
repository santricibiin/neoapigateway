/**
 * Client gopay-api-gateway (GoPay Merchant 2).
 * Gateway self-hosted (default :3005), API key via query param / X-Api-Key.
 * Config dari Setting DB (gopay2BaseUrl/gopay2ApiKey), fallback env.
 */
import { prisma } from "@/lib/prisma";
import { verifyQrisCrc } from "@/lib/qris";
import { fulfillOrder } from "@/lib/payment-matcher";
import { notifyTopupPaid } from "@/lib/telegram-notify";

const TIMEOUT_MS = 15_000;
export const GOPAY2_PROVIDER = "gopaymerchant2";

export type Gopay2Cfg = { baseUrl?: string | null; apiKey?: string | null };

function resolve(cfg?: Gopay2Cfg) {
  const baseUrl = (cfg?.baseUrl || process.env.GOPAY2_BASE_URL || "").replace(/\/$/, "");
  const apiKey = cfg?.apiKey || process.env.GOPAY2_API_KEY || "";
  return { baseUrl, apiKey };
}

export function gopay2Configured(cfg?: Gopay2Cfg) {
  const { baseUrl, apiKey } = resolve(cfg);
  return Boolean(baseUrl && apiKey);
}

async function gopay2Get<T>(path: string, params: Record<string, string | number>, cfg?: Gopay2Cfg): Promise<T> {
  const { baseUrl, apiKey } = resolve(cfg);
  const u = new URL(`${baseUrl}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  u.searchParams.set("api_key", apiKey);
  const res = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json as { success?: boolean }).success === false) {
    throw new Error((json as { error?: string }).error || `Gateway error (${res.status})`);
  }
  return json;
}

/** Ambil config gateway dari Setting DB. */
export async function getGopay2Config(): Promise<Gopay2Cfg> {
  const s = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { gopay2BaseUrl: true, gopay2ApiKey: true },
  });
  return { baseUrl: s?.gopay2BaseUrl, apiKey: s?.gopay2ApiKey };
}

/** Buat QRIS dinamis → { trx_id, qris_code, ... } */
export async function gopay2CreateQris(amount: number, cfg?: Gopay2Cfg) {
  const json = await gopay2Get<{ data: { trx_id: string; qris_code: string } }>("/create-qris", { amount }, cfg);
  if (!json.data?.qris_code || !json.data?.trx_id) throw new Error("Gateway tidak mengembalikan qris_code/trx_id");
  return json.data;
}

/** Cek lunas — match nominal exact, scope trx_id (anti klaim ganda). */
export async function gopay2CheckPayment(amount: number, trxId: string, cfg?: Gopay2Cfg) {
  const json = await gopay2Get<{ paid?: boolean; transaction?: unknown }>("/check-payment", { amount, trx_id: trxId }, cfg);
  return { paid: json.paid === true, transaction: json.transaction };
}

/** Push QRIS statis ke gateway (POST /config) — aktif tanpa restart. */
export async function gopay2PushQrisStatic(qrisStatic: string, cfg?: Gopay2Cfg) {
  const { baseUrl, apiKey } = resolve(cfg);
  const res = await fetch(`${baseUrl}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify({ qris_static: qrisStatic }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && (json as { success?: boolean }).success === true, error: (json as { message?: string }).message };
}

/** Validasi config gateway dari FormData (server action). */
export function validateGopay2Fields(baseUrl: string, apiKey: string, qrisStatic: string): string | null {
  if (baseUrl && !/^https?:\/\/.+/.test(baseUrl)) return "URL Gateway GoPay harus diawali http:// atau https://";
  if (apiKey && apiKey.length < 8) return "API Key Gateway GoPay minimal 8 karakter";
  if (qrisStatic && qrisStatic.length < 50) return "QRIS statis GoBiz minimal 50 karakter";
  if (qrisStatic && !verifyQrisCrc(qrisStatic)) return "QRIS statis GoBiz tidak valid (CRC gagal)";
  return null;
}

/**
 * Poll gateway → match order gopaymerchant2 pending → claim → fulfill.
 * Dipicu dari status route (web) & loop poll-bot (order bot Telegram).
 * Guard interval 15 detik biar aman dari rate-limit GoPay.
 */
let gopay2Busy = false;
let lastGopay2PollMs = 0;
const GOPAY2_POLL_INTERVAL_MS = 15_000;

export async function matchGopayMerchant2Payments(): Promise<void> {
  if (gopay2Busy) return;
  if (Date.now() - lastGopay2PollMs < GOPAY2_POLL_INTERVAL_MS) return;
  lastGopay2PollMs = Date.now();
  gopay2Busy = true;
  try {
    const cfg = await getGopay2Config();
    if (!gopay2Configured(cfg)) return;

    // Grace 10 mnt: bayar tepat setelah expire tetap di-match (uang masuk jangan menggantung)
    const graceCutoff = new Date(Date.now() - 10 * 60 * 1000);
    const [shopOrders, reswebOrders] = await Promise.all([
      prisma.paymentOrder.findMany({
        where: {
          currency: "idr",
          qrisProvider: GOPAY2_PROVIDER,
          gopayTrxId: { not: null },
          status: { in: ["pending", "expired"] },
          expiresAt: { gte: graceCutoff },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      prisma.resellerWebOrder.findMany({
        where: { qrisProvider: GOPAY2_PROVIDER, gopayTrxId: { not: null }, status: { in: ["pending", "expired"] }, expiresAt: { gte: graceCutoff } },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
    ]);
    if (!shopOrders.length && !reswebOrders.length) return;

    for (const order of shopOrders) {
      const trxId = order.gopayTrxId;
      if (!trxId) continue;

      // Dedup: trx_id sudah pernah match (anti double-delivery)
      const exists = await prisma.paymentEvent.findUnique({
        where: { eventKey: `gopay2:${trxId}` },
        select: { id: true },
      });
      if (exists) continue;

      let paid = false;
      let tx: unknown;
      try {
        ({ paid, transaction: tx } = await gopay2CheckPayment(order.amount, trxId, cfg));
      } catch (e) {
        console.error("[gopay2] check-payment:", e instanceof Error ? e.message : e);
        continue; // gateway down → coba siklus berikutnya
      }
      if (!paid) continue;

      const event = await prisma.paymentEvent.upsert({
        where: { eventKey: `gopay2:${trxId}` },
        create: {
          eventKey: `gopay2:${trxId}`,
          provider: GOPAY2_PROVIDER,
          pkg: "gopay.merchant2",
          name: "GoPay Merchant 2",
          text: `Rp ${order.amount} via gateway (${trxId})`,
          amount: order.amount,
          raw: JSON.stringify({ trxId, transaction: tx ?? {} }),
        },
        update: {},
      });
      if (event.matched) continue;

      // Claim atomik sebelum deliver — anti double-delivery
      const claimed = await prisma.$transaction(async (t) => {
        const updated = await t.paymentOrder.updateMany({
          where: { id: order.id, status: { in: ["pending", "expired"] } },
          data: { status: "processing", paymentEventId: event.id, paidAt: new Date() },
        });
        if (!updated.count) return false;
        await t.paymentEvent.update({ where: { id: event.id }, data: { matched: true } });
        return true;
      });
      if (!claimed) continue;

      console.log("[gopay2] matched", order.invoice, order.amount, trxId);
      await fulfillOrder(order.id).catch((e) => console.error("[gopay2] fulfill:", e instanceof Error ? e.message : e));
    }

    for (const order of reswebOrders) {
      const trxId = order.gopayTrxId;
      if (!trxId) continue;

      const exists = await prisma.paymentEvent.findUnique({
        where: { eventKey: `gopay2:${trxId}` },
        select: { id: true },
      });
      if (exists) continue;

      let paid = false;
      let tx: unknown;
      try {
        ({ paid, transaction: tx } = await gopay2CheckPayment(order.amount, trxId, cfg));
      } catch (e) {
        console.error("[gopay2] check-payment (resweb):", e instanceof Error ? e.message : e);
        continue;
      }
      if (!paid) continue;

      // Claim atomik + tambah saldo reseller dalam 1 transaction (pola claimReswebOrder)
      const claimedOrder = await prisma.$transaction(async (t) => {
        const event = await t.paymentEvent.upsert({
          where: { eventKey: `gopay2:${trxId}` },
          create: {
            eventKey: `gopay2:${trxId}`,
            provider: GOPAY2_PROVIDER,
            pkg: "gopay.merchant2",
            name: "GoPay Merchant 2",
            text: `Rp ${order.amount} via gateway (${trxId})`,
            amount: order.amount,
            raw: JSON.stringify({ trxId, transaction: tx ?? {} }),
          },
          update: {},
        });
        if (event.matched) return null;

        const updated = await t.resellerWebOrder.updateMany({
          where: { id: order.id, status: { in: ["pending", "expired"] } },
          data: { status: "paid", paidAt: new Date() },
        });
        if (!updated.count) return null;
        await t.paymentEvent.update({ where: { id: event.id }, data: { matched: true } });
        await t.resellerWeb.update({
          where: { id: order.resellerId },
          data: { balance: { increment: order.tokens } },
        });
        return order;
      });
      if (!claimedOrder) continue;

      console.log("[gopay2] matched resweb", order.invoice, order.amount, trxId);
      await notifyTopupPaid({
        invoice: claimedOrder.invoice,
        tokens: formatTokensShort(claimedOrder.tokens),
        resellerId: claimedOrder.resellerId,
        amount: claimedOrder.amount,
        paidAt: new Date(),
      }).catch((e) => console.error("[gopay2] notify topup:", e instanceof Error ? e.message : e));
    }
  } catch (e) {
    console.error("[gopay2] poll error:", e instanceof Error ? e.message : e);
  } finally {
    gopay2Busy = false;
  }
}

/** "500000000" → "500M". */
function formatTokensShort(tokens: bigint): string {
  const n = Number(tokens);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("id-ID");
}
