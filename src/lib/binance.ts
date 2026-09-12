import crypto from "node:crypto";
import https from "node:https";
import dns from "node:dns";

/**
 * Binance API client (read-only) — auto-detect pembayaran:
 * - Binance Pay UID : GET /sapi/v1/pay/transactions
 * - USDT deposit    : GET /sapi/v1/capital/deposit/hisrec (TRC20/BEP20/ERC20/SOL)
 *
 * Amount USDT disimpan sebagai integer cents (2 desimal) agar bisa
 * di-match persis seperti amount IDR (prisma Int).
 *
 * Binance diblokir DNS oleh sebagian ISP Indonesia (DNS hijack) —
 * resolve via DNS-over-HTTPS (Cloudflare) + koneksi langsung ke IP.
 */

const BASE_HOST = "api.binance.com";

/** Network USDT yang didukung + mapping ke field network Binance. */
export const USDT_NETWORKS = ["TRC20", "BEP20", "ERC20", "SOL"] as const;
export type UsdtNetwork = (typeof USDT_NETWORKS)[number];

/** DoH resolver dengan cache 5 menit. */
const dohCache = new Map<string, { ips: string[]; at: number }>();
const DOH_TTL_MS = 5 * 60 * 1000;

async function dohLookup(hostname: string): Promise<string[]> {
  const hit = dohCache.get(hostname);
  if (hit && Date.now() - hit.at < DOH_TTL_MS) return hit.ips;
  const providers = [
    `https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`,
    `https://dns.google/resolve?name=${hostname}&type=A`,
  ];
  for (const url of providers) {
    try {
      const res = await fetch(url, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(5000),
      });
      const json = (await res.json()) as { Answer?: { data: string }[] };
      const ips = (json.Answer ?? [])
        .map((a) => a.data)
        .filter((d) => /^[0-9.]+$/.test(d));
      if (ips.length) {
        dohCache.set(hostname, { ips, at: Date.now() });
        return ips;
      }
    } catch {
      /* coba provider berikutnya */
    }
  }
  return [];
}

/** lookup handler signature dns.lookup — dipakai di https.request (dukung all:true & single). */
function customLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | Array<{ address: string; family: number }>,
    family?: number
  ) => void
) {
  void dohLookup(hostname)
    .then((ips) => {
      if (ips.length) {
        if (options?.all) {
          callback(null, ips.map((ip) => ({ address: ip, family: 4 })));
        } else {
          callback(null, ips[0], 4);
        }
      } else {
        dns.lookup(hostname, options, (err, address, family) => {
          if (err) return callback(err, "");
          if (options?.all) {
            callback(null, address as Array<{ address: string; family: number }>);
          } else {
            callback(null, address as string, family);
          }
        });
      }
    })
    .catch((e) => callback(e as NodeJS.ErrnoException, ""));
}

/** GET https custom: resolve via DoH, SNI tetap hostname, timeout 10 dtk. */
export function httpsGet(
  hostname: string,
  path: string,
  headers: Record<string, string>
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: hostname,
        servername: hostname,
        path,
        method: "GET",
        headers: { ...headers, Host: hostname },
        lookup: customLookup as never,
        timeout: 10_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() })
        );
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

export type BinanceIncoming = {
  /** ID unik transaksi (anti duplikasi) */
  externalId: string;
  /** amount dalam cents USDT (integer) */
  amountCents: number;
  /** "binancepay" | "usdt" + network deposit */
  source: "binancepay" | "usdt";
  network?: UsdtNetwork;
  /** waktu transaksi (ms) */
  time: number;
  /** info tambahan untuk log raw */
  raw: unknown;
};

function sign(query: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

async function signedGet(
  path: string,
  params: Record<string, string | number>,
  apiKey: string,
  apiSecret: string
): Promise<unknown> {
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    timestamp: String(Date.now() + (await serverTimeOffset())),
    recvWindow: "15000",
  });
  const query = qs.toString();
  const res = await httpsGet(BASE_HOST, `${path}?${query}&signature=${sign(query, apiSecret)}`, {
    "X-MBX-APIKEY": apiKey,
  });
  if (res.status !== 200) {
    throw new Error(`Binance ${path} HTTP ${res.status}: ${res.body.slice(0, 300)}`);
  }
  return JSON.parse(res.body);
}

/** Offset clock server Binance (antisipasi drift lokal). Cache 10 menit. */
let timeOffset = 0;
let timeOffsetAt = 0;
async function serverTimeOffset(): Promise<number> {
  if (Date.now() - timeOffsetAt < 10 * 60 * 1000) return timeOffset;
  try {
    const res = await httpsGet(BASE_HOST, "/api/v3/time", {});
    if (res.status === 200) {
      const json = JSON.parse(res.body) as { serverTime?: number };
      if (json.serverTime) {
        timeOffset = json.serverTime - Date.now();
        timeOffsetAt = Date.now();
      }
    }
  } catch {
    /* pakai offset lama / 0 */
  }
  return timeOffset;
}

/** Parse "12.34" → 1234 (cents). Invalid → null. */
export function parseUsdtCents(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

/**
 * Binance Pay: transaksi masuk (kita sebagai penerima).
 * `amount` negatif = keluar; arah ditentukan dari receiverInfo vs UID kita.
 */
export async function fetchBinancePayIncoming(
  apiKey: string,
  apiSecret: string,
  sinceMs: number,
  myUid?: string | null
): Promise<BinanceIncoming[]> {
  const data = (await signedGet(
    "/sapi/v1/pay/transactions",
    { startTime: sinceMs, limit: 50 },
    apiKey,
    apiSecret
  )) as { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | null;
  const rows = Array.isArray(data) ? data : (data?.data ?? []);
  const uid = String(myUid ?? "").trim();
  const out: BinanceIncoming[] = [];
  for (const r of rows) {
    const currency = String(r.currency || "").toUpperCase();
    if (currency && currency !== "USDT") continue;

    const rawAmount = Number(r.amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) continue;

    if (uid) {
      const receiver = r.receiverInfo as { binanceId?: number | string } | undefined;
      const receiverId = String(receiver?.binanceId ?? "").trim();
      const hasPayer = r.payerInfo != null;
      if (receiverId) {
        if (receiverId !== uid) continue;
      } else if (!hasPayer) {
        continue;
      }
    }

    const cents = parseUsdtCents(rawAmount);
    if (cents == null) continue;
    out.push({
      externalId: String(r.transactionId || r.orderId || ""),
      amountCents: cents,
      source: "binancepay",
      time: Number(r.transactionTime || r.createTime || Date.now()),
      raw: r,
    });
  }
  return out.filter((t) => t.externalId);
}

/** Deposit USDT confirmed (status=1) di network yang didukung. */
export async function fetchUsdtDeposits(
  apiKey: string,
  apiSecret: string,
  sinceMs: number
): Promise<BinanceIncoming[]> {
  const rows = (await signedGet(
    "/sapi/v1/capital/deposit/hisrec",
    { coin: "USDT", startTime: sinceMs, limit: 50 },
    apiKey,
    apiSecret
  )) as Array<Record<string, unknown>> | null;
  const out: BinanceIncoming[] = [];
  for (const r of rows ?? []) {
    if (Number(r.status) !== 1) continue; // 1 = success/confirmed
    const network = String(r.network || "").toUpperCase() as UsdtNetwork;
    if (!USDT_NETWORKS.includes(network)) continue;
    const cents = parseUsdtCents(r.amount as string | number);
    if (cents == null) continue;
    out.push({
      externalId: String(r.txId || ""),
      amountCents: cents,
      source: "usdt",
      network,
      time: Number(r.insertTime || Date.now()) * (Number(r.insertTime) > 1e12 ? 1 : 1000),
      raw: r,
    });
  }
  return out.filter((t) => t.externalId);
}

/** Format cents → "12.34 USDT" */
export function formatUsdt(cents: number) {
  return `${(cents / 100).toFixed(2)} USDT`;
}

/** Konversi IDR → USDT cents. */
export function idrToUsdtCents(idrAmount: number, rate: number): number {
  if (rate <= 0) throw new Error("kurs USDT tidak valid");
  return Math.round((idrAmount / rate) * 100);
}
