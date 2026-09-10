/**
 * Runner WhatsApp bot: jalan terpisah dari Next.js (concurrently).
 * - Sinkron koneksi dari Setting (waEnabled + waPhoneNumber)
 * - Kirim detail produk ke buyer (PaymentOrder.buyerPhone) saat paid
 * Jalankan: npx tsx scripts/poll-wa.ts (sudah digabung di npm run dev)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { onWaState, requestWaPairing, sendWaText, startWaBot, stopWaBot, waState } from "../src/lib/wa-bot";

const prisma = new PrismaClient();
const idr = new Intl.NumberFormat("id-ID");

let enabled = false;
let syncing = false;

function jakartaNow() {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

onWaState((state) => {
  console.log("[wa-state]", JSON.stringify(state));
});

async function syncWa() {
  if (syncing) return;
  syncing = true;
  try {
    const setting = await prisma.setting.findUnique({
      where: { id: 1 },
      select: { waEnabled: true, waPhoneNumber: true, waPairingRequest: true },
    });

    const want = Boolean(setting?.waEnabled);

    if (!want) {
      if (enabled) {
        await stopWaBot();
        enabled = false;
        console.log("[wa] bot dimatikan (setting off)");
      }
      // Bersihkan kode pairing basi saat bot off.
      if (setting?.waPairingRequest) {
        await prisma.setting.update({
          where: { id: 1 },
          data: { waPairingRequest: null, waPairingCode: null },
        });
      }
      return;
    }

    if (!enabled) {
      await startWaBot();
      enabled = true;
      console.log("[wa] bot diaktifkan");
    }

    // Proses permintaan pairing dari admin page.
    if (setting?.waPairingRequest && setting.waPhoneNumber) {
      // Claim request atomik supaya tidak diproses dua kali.
      const claimed = await prisma.setting.updateMany({
        where: { id: 1, waPairingRequest: setting.waPairingRequest },
        data: { waPairingRequest: null },
      });
      if (claimed.count) {
        const st = waState();
        let code: string | null = null;
        if (st.connected) {
          code = null; // sudah login, tidak perlu pairing
        } else {
          code = await requestWaPairing(setting.waPhoneNumber);
        }
        await prisma.setting.update({
          where: { id: 1 },
          data: { waPairingCode: code },
        });
        console.log("[wa] pairing code:", code ?? "(sudah login / gagal)");
      }
    }
  } catch (error) {
    console.error("[wa] sync gagal:", error instanceof Error ? error.message : error);
  } finally {
    syncing = false;
  }
}

/** Kirim detail produk ke WA buyer untuk order paid yang belum dinotifikasi. */
async function notifyPaidWaOrders() {
  if (!waState().connected) return;

  const orders = await prisma.paymentOrder.findMany({
    where: {
      status: "paid",
      waNotifiedAt: null,
      buyerPhone: { not: null },
      telegramUserId: null, // order bot telegram punya jalur notifikasi sendiri
    },
    take: 20,
  });

  for (const order of orders) {
    // Claim atomik: cegah dobel kirim saat beberapa instance jalan.
    const claimed = await prisma.paymentOrder.updateMany({
      where: { id: order.id, status: "paid", waNotifiedAt: null },
      data: { waNotifiedAt: new Date() },
    });
    if (!claimed.count) continue;

    const delivered = order.delivered || `${order.qty}x ${order.productName}`;
    const text = [
      `✅ PEMBAYARAN BERHASIL`,
      ``,
      `🧾 Invoice : ${order.invoice}`,
      `📦 Produk  : ${order.productName}`,
      `🔢 Jumlah  : ${order.qty}x`,
      `💰 Total   : Rp ${idr.format(order.amount)}`,
      `⏰ Waktu   : ${jakartaNow()} WIB`,
      ``,
      `── DETAIL PRODUK ──`,
      delivered,
      ``,
      `Simpan data di atas. Cek status pesanan kapan saja di halaman Track Order.`,
    ].join("\n");

    const ok = await sendWaText(order.buyerPhone!, text);
    console.log(`[wa] ${ok ? "terkirim" : "GAGAL"} → ${order.invoice} (${order.buyerPhone})`);
  }
}

async function main() {
  await syncWa();
  setInterval(() => void syncWa(), 5_000);
  setInterval(() => void notifyPaidWaOrders().catch(console.error), 5_000);

  const stop = (signal: string) => {
    console.log("[wa] stop", signal);
    void stopWaBot();
    prisma.$disconnect().finally(() => process.exit(0));
  };
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
