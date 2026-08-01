/**
 * QRIS Statis → Dinamis (EMVCo TLV)
 * - 01: 11 static → 12 dynamic
 * - 54: amount before 58
 * - 63: CRC-16/CCITT-FALSE
 */

export type FeeType = "r" | "p";
export type ConvertOptions = {
  amount: number | string;
  includeFee?: boolean;
  feeType?: FeeType;
  fee?: number | string;
};

type Tlv = { id: string; value: string };

function crc16CcittFalse(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  if (id.length !== 2) throw new Error(`tag id must be 2 chars: ${id}`);
  if (value.length > 99) throw new Error(`value too long for tag ${id}`);
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function parseTlv(payload: string): Tlv[] {
  const out: Tlv[] = [];
  let i = 0;
  while (i + 4 <= payload.length) {
    const id = payload.slice(i, i + 2);
    const len = Number.parseInt(payload.slice(i + 2, i + 4), 10);
    if (!Number.isFinite(len) || len < 0) throw new Error(`bad TLV length at ${i}`);
    const value = payload.slice(i + 4, i + 4 + len);
    if (value.length !== len) throw new Error(`truncated TLV tag ${id}`);
    out.push({ id, value });
    i += 4 + len;
  }
  if (i !== payload.length) throw new Error("trailing garbage in QRIS");
  return out;
}

function serializeTlv(tags: Tlv[]): string {
  return tags.map((t) => tlv(t.id, t.value)).join("");
}

function normalizeAmount(amount: number | string): string {
  const n = typeof amount === "number" ? amount : Number(String(amount).replace(/\D/g, ""));
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new Error("amount must be positive integer rupiah");
  }
  return String(n);
}

export function qrisStaticToDynamic(staticQris: string, opts: ConvertOptions): string {
  const amount = normalizeAmount(opts.amount);
  const tags = parseTlv(staticQris.trim());
  if (!tags.find((t) => t.id === "63")) throw new Error("QRIS invalid: missing tag 63");

  let body = tags.filter((t) => t.id !== "63" && !["54", "55", "56", "57"].includes(t.id));
  body = body.map((t) => (t.id === "01" && t.value === "11" ? { id: "01", value: "12" } : t));

  const insert: Tlv[] = [{ id: "54", value: amount }];
  if (opts.includeFee) {
    const feeRaw =
      typeof opts.fee === "number" ? opts.fee : Number(String(opts.fee ?? "").replace(",", "."));
    if (Number.isFinite(feeRaw) && feeRaw > 0) {
      if ((opts.feeType ?? "r") === "p") {
        insert.push({ id: "55", value: "03" }, { id: "57", value: String(feeRaw) });
      } else {
        insert.push({ id: "55", value: "02" }, { id: "56", value: String(Math.round(feeRaw)) });
      }
    }
  }

  const idx58 = body.findIndex((t) => t.id === "58");
  if (idx58 === -1) throw new Error("QRIS invalid: missing tag 58");
  body = [...body.slice(0, idx58), ...insert, ...body.slice(idx58)];

  const payload = serializeTlv(body) + "6304";
  return payload + crc16CcittFalse(payload);
}

export function verifyQrisCrc(qris: string): boolean {
  try {
    const s = qris.trim();
    const tags = parseTlv(s);
    const crc = tags.find((t) => t.id === "63");
    if (!crc || crc.value.length !== 4) return false;
    return crc16CcittFalse(s.slice(0, -4)) === crc.value.toUpperCase();
  } catch {
    return false;
  }
}
