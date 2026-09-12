/**
 * Background poller Binance — jalan saat server start (Next.js instrumentation).
 * Kalau admin menutup halaman pay, deteksi pembayaran USDT tetap berjalan.
 * Interval 30s; pollBinancePayments punya guard internal sendiri.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { pollBinancePayments } = await import("@/lib/binance-order");
    setInterval(() => void pollBinancePayments(), 30_000);
  } catch (e) {
    console.error("[binance] background poller gagal start:", e instanceof Error ? e.message : e);
  }
}
