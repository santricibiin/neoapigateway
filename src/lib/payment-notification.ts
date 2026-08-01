/** Parse notifikasi pembayaran dari Android notification forwarder (Neobank/DANA/NOBU). */

export type ForwardPayload = {
  eventId?: string;
  name?: string;
  pkg?: string;
  title?: string;
  text?: string;
  subtext?: string;
  bigtext?: string;
  infotext?: string;
  postedAt?: number;
  [key: string]: unknown;
};

export type PaymentProvider = "neobank" | "dana" | "unknown";

export type ParsedPayment = {
  provider: PaymentProvider;
  pkg: string;
  name: string | null;
  title: string | null;
  text: string;
  subtext: string | null;
  bigtext: string | null;
  infotext: string | null;
  amount: number | null;
  account: string | null;
  isPayment: boolean;
};

const PKG_PROVIDER: Record<string, PaymentProvider> = {
  "com.bnc.finance": "neobank",
  "id.dana": "dana",
};

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** "Rp196" | "Rp 1.000" | "Rp1.234.567" → number */
export function parseRupiahAmount(text: string): number | null {
  const m = text.match(/Rp\s*([\d.,]+)/i);
  if (!m) return null;
  const digits = m[1].replace(/\./g, "").replace(/,/g, "");
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Rekening digit murni atau mask (5859********8988) */
export function parseAccount(text: string): string | null {
  const mask = text.match(/\b(\d{3,}\*{2,}\d{2,})\b/);
  if (mask) return mask[1];
  const plain = text.match(/\b(\d{6,20})\s*$/);
  return plain ? plain[1] : null;
}

function detectProvider(pkg: string, name: string | null): PaymentProvider {
  if (PKG_PROVIDER[pkg]) return PKG_PROVIDER[pkg];
  const n = (name ?? "").toLowerCase();
  if (n.includes("neo") || n.includes("bnc")) return "neobank";
  if (n.includes("dana")) return "dana";
  return "unknown";
}

function isPaymentNotif(provider: PaymentProvider, title: string | null, text: string): boolean {
  const t = `${title ?? ""}\n${text}`;
  if (provider === "neobank") {
    return (
      /pembayaran\s+qris\s+diterima/i.test(t) ||
      /menerima\s+\d+\s+pembayaran/i.test(title ?? "") ||
      /akan\s+dikreditkan/i.test(t)
    );
  }
  if (provider === "dana") {
    return (
      /pembayaran\s+masuk/i.test(title ?? "") ||
      /diterima\s+dana/i.test(t) ||
      /rp\s*[\d.,]+\s+diterima/i.test(t)
    );
  }
  // unknown pkg: simpan jika ada Rp amount
  return parseRupiahAmount(t) != null;
}

export function parsePaymentNotification(body: ForwardPayload): ParsedPayment {
  const text = str(body.text) ?? str(body.bigtext) ?? str(body.title) ?? "";
  const bigtext = str(body.bigtext);
  const title = str(body.title);
  const name = str(body.name);
  const pkg = str(body.pkg) ?? "unknown";
  const combined = [text, bigtext, title].filter(Boolean).join("\n");
  const provider = detectProvider(pkg, name);

  return {
    provider,
    pkg,
    name,
    title,
    text: text || combined || "(empty)",
    subtext: str(body.subtext),
    bigtext,
    infotext: str(body.infotext),
    amount: parseRupiahAmount(combined),
    account: parseAccount(combined),
    isPayment: isPaymentNotif(provider, title, combined),
  };
}

export function makeEventKey(body: ForwardPayload): string {
  const text = str(body.text) ?? "";
  const title = str(body.title) ?? "";
  const pkg = str(body.pkg) ?? "unknown";
  const postedAt = Number.isFinite(Number(body.postedAt)) ? String(body.postedAt) : String(Date.now());
  if (str(body.eventId)) return str(body.eventId)!;
  return `${pkg}|${title}|${text}|${postedAt}`;
}
