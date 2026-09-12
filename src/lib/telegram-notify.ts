import { prisma } from "@/lib/prisma";

/** Masking identitas untuk notifikasi publik. */
export function maskInvoice(inv: string): string {
  if (inv.length <= 6) return inv;
  return inv.slice(0, 3) + "*".repeat(inv.length - 6) + inv.slice(-3);
}

export function maskName(name: string): string {
  if (name.length <= 2) return name;
  return name[0] + "•".repeat(Math.min(name.length - 2, 5)) + name.slice(-1);
}

export function maskId(id: string): string {
  if (id.length <= 4) return id;
  return id.slice(0, 2) + "••••" + id.slice(-2);
}

function wibTime(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(":", ".");
}

const rupiah = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;
/** Format amount sesuai currency: usdt = cents → "13.37 USDT". */
const fmtCurrency = (v: number, currency: "idr" | "usdt") =>
  currency === "usdt" ? `${(v / 100).toFixed(2)} USDT` : rupiah(v);

/** Kirim teks ke channel notif (Setting.telegramBotToken + notifyChannelId). Fire-and-forget. */
async function send(text: string): Promise<void> {
  try {
    const s = await prisma.setting.findUnique({
      where: { id: 1 },
      select: { telegramBotToken: true, notifyChannelId: true },
    });
    if (!s?.telegramBotToken || !s.notifyChannelId) return;
    await fetch(`https://api.telegram.org/bot${s.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: s.notifyChannelId, text }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Notifikasi tidak boleh menggagalkan fulfillment.
  }
}

export interface OrderNotifData {
  invoice: string;
  productName: string;
  productSku: string | null;
  qty: number;
  amount: number;
  currency?: "idr" | "usdt";
  /** Nomor HP (order web) atau user ID Telegram (order bot). */
  buyerPhone?: string | null;
  telegramUserId?: string | null;
  paidAt?: Date | null;
}

/** Notif order toko sukses (PaymentOrder paid). */
export async function notifyOrderPaid(o: OrderNotifData): Promise<void> {
  const buyer = o.telegramUserId ? `TG ${maskId(o.telegramUserId)}` : o.buyerPhone ? maskId(o.buyerPhone) : "—";
  const text = [
    "✨ TRANSAKSI SUKSES ✨",
    "┏━━━━━━━━━━━━━━━━━━┓",
    "┃   💎 ORDER LUNAS   ┃",
    "┗━━━━━━━━━━━━━━━━━━┛",
    `🧾 Invoice  · ${maskInvoice(o.invoice)}`,
    `📦 Produk   · ${o.productName}`,
    `🏷 Kode     · ${o.productSku || "-"}`,
    `🔢 Jumlah   · ×${o.qty}`,
    `💰 Total    · ${fmtCurrency(o.amount, o.currency ?? "idr")}`,
    `👤 Pembeli  · ${buyer}`,
    `⏰ Waktu    · ${wibTime(o.paidAt ?? new Date())} WIB`,
    "✅ Stok terkirim ke customer",
    "🚀 Terima kasih sudah belanja!",
  ].join("\n");
  await send(text);
}

export interface TopupNotifData {
  invoice: string;
  /** Jumlah token yang masuk (sudah dalam satuan penuh). */
  tokens: string;
  resellerId: number;
  amount: number;
  via?: string;
  paidAt?: Date | null;
}

/** Notif topup kuota sukses (ResellerWebOrder paid / tambah kuota member). */
export async function notifyTopupPaid(t: TopupNotifData): Promise<void> {
  const text = [
    "✨ TRANSAKSI SUKSES ✨",
    "┏━━━━━━━━━━━━━━━━━━┓",
    "┃   💎 TOPUP LUNAS   ┃",
    "┗━━━━━━━━━━━━━━━━━━┛",
    `🧾 Invoice        · ${maskInvoice(t.invoice)}`,
    `➕ Tambahan kuota · ${t.tokens}`,
    `🆔 User ID        · ${t.resellerId}`,
    `💰 Total          · ${rupiah(t.amount)}`,
    `🌐 Via            · ${t.via ?? "Web"}`,
    `⏰ Waktu          · ${wibTime(t.paidAt ?? new Date())} WIB`,
    "✅ Kuota berhasil ditambahkan",
    "🚀 Terima kasih sudah topup!",
  ].join("\n");
  await send(text);
}
