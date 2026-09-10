"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { copyText } from "@/lib/copy";
import { useLang, useT } from "@/lib/lang";
import { updateOrderHistory } from "@/lib/order-history";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  XCircle,
  Zap,
} from "lucide-react";

interface PayOrder {
  invoice: string;
  status: string;
  amount: number;
  qty: number;
  unitPrice: number;
  productName: string;
  productSku: string | null;
  qrisPayload: string;
  expiresAt: string;
  delivered: string | null;
  paidAt: string | null;
  productId: number | null;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCountdown(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const STATUS_LABEL_ID: Record<string, string> = {
  pending: "Menunggu Pembayaran",
  processing: "Memproses",
  delivering: "Mengirim",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  failed: "Gagal",
};

const STATUS_LABEL_EN: Record<string, string> = {
  pending: "Awaiting Payment",
  processing: "Processing",
  delivering: "Delivering",
  paid: "Paid",
  expired: "Expired",
  failed: "Failed",
};

export function PayClient({ order: initialOrder }: { order: PayOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");
  const t = useT();
  const { lang } = useLang();

  const isPaid = order.status === "paid";
  const isExpired = order.status === "expired" || order.status === "failed";
  const isPending = !isPaid && !isExpired;

  useEffect(() => {
    QRCode.toDataURL(order.qrisPayload, { width: 512, margin: 2 })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [order.qrisPayload]);

  useEffect(() => {
    if (!isPending) return;

    const expires = new Date(order.expiresAt);
    setCountdown(formatCountdown(expires));
    const timer = setInterval(() => setCountdown(formatCountdown(expires)), 1000);

    const poll = async () => {
      try {
        const r = await fetch(`/api/payment/status/${order.invoice}`, { cache: "no-store" });
        const data = await r.json();
        if (data.ok) {
          setOrder((prev) => {
            if (prev.status === data.status) return prev;
            // Sinkronkan riwayat localStorage (badge Lunas/Kedaluwarsa di page order).
            updateOrderHistory(order.invoice, data.status, data.delivered || undefined);
            return {
              ...prev,
              status: data.status,
              paidAt: data.paidAt ?? prev.paidAt,
              delivered: data.delivered ?? prev.delivered,
            };
          });
        }
      } catch {}
    };
    poll();
    const poller = setInterval(poll, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, [order.invoice, isPending]);

  async function copyValue(label: string, value: string) {
    await copyText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  const statusLabel = (lang === "en" ? STATUS_LABEL_EN : STATUS_LABEL_ID)[order.status] ?? order.status;

  return (
    <div className="relative flex min-h-screen flex-col gap-6 overflow-x-hidden py-6 sm:gap-8 sm:py-8">
      <FloatingShapes />
      <div className="relative">
        <Link href={`/order/${order.productId ?? ""}`} className="inline-flex items-center gap-2 text-sm font-bold text-base-ink/70 hover:text-base-ink">
          <ArrowLeft className="h-4 w-4" />
          {t("Kembali ke Produk")}
        </Link>
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        {/* Kiri: QR / status */}
        <div className="flex flex-col gap-5">
          <AnimatePresence mode="wait">
            {isPending && (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="flex flex-col items-center gap-5 rounded-neo border-2 border-base-ink bg-base-surface p-6 shadow-neo sm:p-8"
              >
                <div className="flex items-center gap-2 self-start">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky shadow-neo-sm">
                    <QrCode className="h-4.5 w-4.5" strokeWidth={2.5} />
                  </span>
                  <div>
                    <h1 className="text-lg font-extrabold sm:text-xl">{t("Scan QRIS untuk Bayar")}</h1>
                    <p className="text-xs font-semibold text-base-ink/55">{t("Bayar tepat sesuai nominal. Pembayaran akan dicek otomatis.")}</p>
                  </div>
                </div>

                <div className="rounded-neo border-2 border-base-ink bg-white p-4 shadow-neo">
                  {qrUrl ? (
                    <img src={qrUrl} alt="QRIS" className="h-56 w-56 max-w-full sm:h-72 sm:w-72" />
                  ) : (
                    <div className="flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72">
                      <Loader2 className="h-8 w-8 animate-spin text-base-ink/40" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-neo border-2 border-base-ink bg-base-bg px-4 py-2 shadow-neo-sm">
                  <Clock className="h-4 w-4" strokeWidth={2.5} />
                  <span className="text-sm font-bold">{t("Berlaku")}</span>
                  <span className="font-mono text-lg font-black tabular-nums">{countdown}</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-base-ink/50">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {t("Status diperbarui otomatis.")}
                </div>
              </motion.div>
            )}

            {isPaid && (
              <motion.div
                key="paid"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-5"
              >
                {/* Hero sukses */}
                <div className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-accent-mint p-8 text-center shadow-neo">
                  <motion.svg
                    animate={{ rotate: 360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white/30"
                    viewBox="0 0 100 100"
                    fill="currentColor"
                    aria-hidden
                  >
                    <circle cx="50" cy="50" r="45" />
                  </motion.svg>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.15 }}
                    className="relative mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-base-ink bg-white shadow-neo-sm"
                  >
                    <CheckCircle2 className="h-10 w-10 text-green-600" strokeWidth={2.5} />
                  </motion.div>
                  <h1 className="relative mt-4 text-3xl font-black tracking-tight">{t("Pembayaran Berhasil!")}</h1>
                  <p className="relative mt-1 text-sm font-bold text-base-ink/60">
                    {t("Pembayaran terdeteksi otomatis — detail produk langsung tampil di halaman ini.")}
                  </p>
                  <div className="relative mt-4 inline-flex items-center gap-2 rounded-full border-2 border-base-ink bg-white px-4 py-1.5 text-xs font-black uppercase tracking-wider">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" strokeWidth={2.5} />
                    {t("Lunas")} · {order.paidAt ? new Date(order.paidAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : ""}
                  </div>
                </div>

                {/* Detail produk terkirim */}
                {order.delivered ? (
                  <div className="rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo sm:p-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
                        <ShoppingCart className="h-4 w-4" />
                        {t("Detail Produk")}
                      </span>
                      <button
                        onClick={() => copyValue("delivered", order.delivered || "")}
                        className="inline-flex items-center gap-1.5 rounded-neo border-2 border-base-ink bg-base-surface px-2.5 py-1 text-xs font-bold shadow-neo-sm transition-colors hover:bg-accent-sky"
                      >
                        <Copy className="h-3 w-3" />
                        {copied === "delivered" ? t("Tersalin") : t("Salin")}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap break-all rounded-neo border-2 border-base-ink bg-base-ink p-4 font-mono text-xs leading-relaxed text-accent-mint shadow-neo-sm">{order.delivered}</pre>
                    <div className="mt-3 rounded-neo border-2 border-base-ink/10 bg-base-bg p-3">
                      <p className="text-xs font-bold text-base-ink/60">
                        {t("Simpan data di atas — ini kunci akses produk Anda.")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-4 shadow-neo-sm">
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                    <p className="text-sm font-bold text-base-ink/70">
                      {t("Produk sedang diproses dan dikirim otomatis — halaman ini diperbarui sendiri.")}
                    </p>
                  </div>
                )}

                {/* CTA */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  {order.productId ? (
                    <Link href={`/order/${order.productId}`} className="flex-1">
                      <Button variant="primary" size="lg" className="w-full">
                        <ShoppingCart className="h-4 w-4" />
                        {t("Beli Produk Ini Lagi")}
                      </Button>
                    </Link>
                  ) : null}
                  <Link href={`/track/${order.invoice}`} className="flex-1">
                    <Button variant="outline" size="lg" className="w-full">
                      <Receipt className="h-4 w-4" />
                      {t("Cek Pesanan")}
                    </Button>
                  </Link>
                  <Link href="/products" className="flex-1">
                    <Button variant="outline" size="lg" className="w-full">
                      <Zap className="h-4 w-4" />
                      {t("Kembali ke Katalog")}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}

            {isExpired && (
              <motion.div
                key="expired"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 rounded-neo border-2 border-base-ink bg-accent-sun p-8 text-center shadow-neo"
              >
                <XCircle className="h-12 w-12" strokeWidth={2.5} />
                <h1 className="text-2xl font-black">{t("Invoice Kedaluwarsa")}</h1>
                <p className="text-sm font-bold text-base-ink/60">{t("Silakan buat order baru jika ingin membayar.")}</p>
                {order.productId ? (
                  <Link href={`/order/${order.productId}`}>
                    <Button variant="primary" size="lg">
                      <Zap className="h-4 w-4" />
                      {t("Order Sekarang")}
                    </Button>
                  </Link>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-base-ink/50">
              <Clock className="h-4 w-4" />
              {t("Cara Pembayaran")}
            </h2>
            <ol className="mt-3 grid gap-3 sm:grid-cols-3">
              <li className="flex gap-3 rounded-neo border-2 border-base-ink/10 bg-base-bg p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky text-xs font-black">1</span>
                <p className="text-xs font-semibold text-base-ink/70">{t("Buka aplikasi e-wallet / m-banking, pilih menu scan QRIS.")}</p>
              </li>
              <li className="flex gap-3 rounded-neo border-2 border-base-ink/10 bg-base-bg p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky text-xs font-black">2</span>
                <p className="text-xs font-semibold text-base-ink/70">{t("Arahkan kamera ke QR di samping, bayar")} <span className="font-extrabold text-base-ink">{t("tepat sesuai nominal.")}</span></p>
              </li>
              <li className="flex gap-3 rounded-neo border-2 border-base-ink/10 bg-base-bg p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky text-xs font-black">3</span>
                <p className="text-xs font-semibold text-base-ink/70">{t("Pembayaran terdeteksi otomatis — detail produk langsung tampil di halaman ini.")}</p>
              </li>
            </ol>
          </div>
        </div>

        {/* Kanan: invoice & jumlah */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-base-ink/50">
                <Receipt className="h-4 w-4" />
                {t("No. Invoice")}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border-2 border-base-ink px-2.5 py-1 text-[10px] font-black uppercase ${
                  isPaid ? "bg-accent-mint" : isExpired ? "bg-red-200" : "bg-accent-skySoft"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-green-600" : isExpired ? "bg-red-500" : "bg-blue-500"}`} />
                {statusLabel}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-neo border-2 border-base-ink/10 bg-base-bg p-3">
              <span className="break-all font-mono text-sm font-bold">{order.invoice}</span>
              <button
                onClick={() => copyValue("invoice", order.invoice)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-neo border-2 border-base-ink bg-base-surface px-2 py-1 text-xs font-bold shadow-neo-sm"
              >
                <Copy className="h-3 w-3" />
                {copied === "invoice" ? t("Tersalin") : t("Salin")}
              </button>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-base-ink/45">⚠️ {t("Simpan nomor invoice untuk cek pesanan")}</p>
          </div>

          <div className="rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-base-ink/50">
              <Receipt className="h-4 w-4" />
              {t("Ringkasan Pesanan")}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="font-semibold text-base-ink/60">{t("Produk")}</dt>
                <dd className="text-right font-bold">{order.productName}</dd>
              </div>
              {order.productSku && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-base-ink/60">SKU</dt>
                  <dd className="font-mono font-bold">{order.productSku}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <dt className="font-semibold text-base-ink/60">{t("Qty")}</dt>
                <dd className="font-bold">{order.qty}x</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="font-semibold text-base-ink/60">{t("Harga Satuan")}</dt>
                <dd className="font-bold">{formatRupiah(order.unitPrice)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-base-ink/15 pt-2">
                <dt className="font-extrabold">{t("Total yang harus dibayar")}</dt>
                <dd className="text-xl font-extrabold">{formatRupiah(order.amount)}</dd>
              </div>
            </dl>
            <button
              onClick={() => copyValue("amount", String(order.amount))}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-neo border-2 border-base-ink bg-base-surface px-3 py-2 text-xs font-bold shadow-neo-sm"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied === "amount" ? t("Tersalin") : t("Salin Nominal")}
            </button>
            <p className="mt-3 text-[11px] font-semibold text-base-ink/45">
              {t("Total akhir ditambah kode unik untuk verifikasi otomatis.")}
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-neo border-2 border-base-ink bg-accent-sunSoft p-4">
            <ShieldCheck className="h-5 w-5 shrink-0" strokeWidth={2.5} />
            <p className="text-xs font-bold text-base-ink/70">
              {t("Semua aktivitas pembayaran dipantau 24 jam dan invoice berlaku 10 menit.")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
