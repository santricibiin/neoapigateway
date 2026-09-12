"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { copyText } from "@/lib/copy";
import { useLang, useT } from "@/lib/lang";
import { updateOrderHistory } from "@/lib/order-history";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Receipt,
  ShoppingCart,
  RefreshCw,
  Zap,
} from "lucide-react";

interface TrackOrder {
  invoice: string;
  status: string;
  amount: number;
  currency: "idr" | "usdt";
  qty: number;
  unitPrice: number;
  productName: string;
  productSku: string | null;
  paidAt: string | null;
  expiresAt: string;
  delivered: string | null;
  createdAt: string;
  product: { id: number; name: string; model: string; sku: string | null; category: string } | null;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAmount(order: TrackOrder) {
  return order.currency === "usdt" ? `${(order.amount / 100).toFixed(2)} USDT` : formatRupiah(order.amount);
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

export function TrackClient({ order: initialOrder }: { order: TrackOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const [copied, setCopied] = useState<string | null>(null);
  const t = useT();
  const { lang } = useLang();

  const isPaid = order.status === "paid";
  const isExpired = order.status === "expired" || order.status === "failed";
  const isPending = !isPaid && !isExpired;

  useEffect(() => {
    if (!isPending) return;
    const poll = async () => {
      try {
        const r = await fetch(`/api/payment/status/${order.invoice}`, { cache: "no-store" });
        const data = await r.json();
        if (data.ok) {
          setOrder((prev) => {
            if (prev.status === data.status) return prev;
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
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [order.invoice, isPending]);

  async function copyValue(label: string, value: string) {
    await copyText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  const statusLabel = (lang === "en" ? STATUS_LABEL_EN : STATUS_LABEL_ID)[order.status] ?? order.status;

  const steps = [
    { key: "created", labelId: "Dibuat", done: true },
    { key: "paid", labelId: "Dibayar", done: isPaid },
    { key: "delivered", labelId: "Terkirim", done: isPaid && Boolean(order.delivered) },
  ];

  return (
    <div className="relative flex min-h-[70vh] flex-col gap-6 overflow-x-hidden py-6 sm:gap-8 sm:py-8">
      <FloatingShapes />

      <div className="relative">
        <Link href="/track" className="inline-flex items-center gap-2 text-sm font-bold text-base-ink/70 hover:text-base-ink">
          <ArrowLeft className="h-4 w-4" />
          {t("Cek Order Lain")}
        </Link>
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        {/* Kiri: status & produk */}
        <div className="flex flex-col gap-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col gap-4 rounded-neo border border-base-line p-6 shadow-neo sm:p-8 ${
              isPaid ? "bg-accent-mint" : isExpired ? "bg-accent-sun" : "bg-base-surface"
            }`}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              {isPaid ? (
                <CheckCircle2 className="h-12 w-12" strokeWidth={2.5} />
              ) : isExpired ? (
                <XCircle className="h-12 w-12" strokeWidth={2.5} />
              ) : (
                <Clock className="h-12 w-12 animate-pulse" strokeWidth={2.5} />
              )}
              <h1 className="text-2xl font-black">{statusLabel}</h1>
              {isPending && (
                <p className="flex items-center gap-2 text-xs font-semibold text-base-ink/55">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {t("Status diperbarui otomatis.")}
                </p>
              )}
              {isExpired && (
                <p className="text-sm font-bold text-base-ink/60">{t("Buat order baru jika ingin membeli.")}</p>
              )}
            </div>

            {/* Timeline status */}
            <div className="flex items-center justify-center gap-0">
              {steps.map((step, i) => (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border border-base-line ${
                        step.done ? "bg-base-ink text-white" : "bg-white text-base-ink/30"
                      }`}
                    >
                      {step.done ? <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> : <Clock className="h-4 w-4" strokeWidth={2.5} />}
                    </span>
                    <span className={`text-[10px] font-black uppercase ${step.done ? "text-base-ink" : "text-base-ink/40"}`}>
                      {t(step.labelId)}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`mx-1 mb-4 h-1 w-12 rounded-full border border-base-ink/20 sm:w-20 ${steps[i + 1].done ? "bg-base-ink" : "bg-base-ink/15"}`} />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {isPaid && order.delivered && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-neo border border-base-line bg-base-surface p-5 shadow-neo sm:p-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
                  <ShoppingCart className="h-4 w-4" />
                  {t("Detail Produk")}
                </span>
                <button
                  onClick={() => copyValue("delivered", order.delivered || "")}
                  className="inline-flex items-center gap-1.5 rounded-neo border border-base-line bg-base-surface px-2 py-1 text-xs font-bold shadow-neo-sm"
                >
                  <Copy className="h-3 w-3" />
                  {copied === "delivered" ? t("Tersalin") : t("Salin")}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-all rounded-neo border border-base-line/10 bg-base-bg p-3 font-mono text-xs leading-relaxed">{order.delivered}</pre>
            </motion.div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {order.product && (
              <Link href={`/order/${order.product.id}`} className="flex-1">
                <Button variant="outline" size="lg" className="w-full">
                  {t("Beli Produk Ini Lagi")}
                </Button>
              </Link>
            )}
            <Link href="/products" className="flex-1">
              <Button variant="primary" size="lg" className="w-full">
                <Zap className="h-4 w-4" />
                {t("Kembali ke Katalog")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Kanan: invoice */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-neo border border-base-line bg-base-surface p-5 shadow-neo sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-base-ink/50">
                <Receipt className="h-4 w-4" />
                {t("No. Invoice")}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border border-base-line px-2.5 py-1 text-[10px] font-black uppercase ${
                  isPaid ? "bg-accent-mint" : isExpired ? "bg-accent-terraSoft" : "bg-accent-skySoft"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-accent-sageDeep" : isExpired ? "bg-[#B4522E]" : "bg-accent-sage"}`} />
                {statusLabel}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-neo border border-base-line/10 bg-base-bg p-3">
              <span className="break-all font-mono text-sm font-bold">{order.invoice}</span>
              <button
                onClick={() => copyValue("invoice", order.invoice)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-neo border border-base-line bg-base-surface px-2 py-1 text-xs font-bold shadow-neo-sm"
              >
                <Copy className="h-3 w-3" />
                {copied === "invoice" ? t("Tersalin") : t("Salin")}
              </button>
            </div>
          </div>

          <div className="rounded-neo border border-base-line bg-base-surface p-5 shadow-neo sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-base-ink/50">
              <Receipt className="h-4 w-4" />
              {t("Ringkasan Pesanan")}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              {order.paidAt && (
                <div className="flex justify-between gap-2">
                  <dt className="font-semibold text-base-ink/60">{t("Tanggal Bayar")}</dt>
                  <dd className="font-bold">
                    {new Date(order.paidAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="font-semibold text-base-ink/60">{t("Produk")}</dt>
                <dd className="text-right font-bold">{order.productName}</dd>
              </div>
              {order.productSku && (
                <div className="flex justify-between gap-2">
                  <dt className="font-semibold text-base-ink/60">SKU</dt>
                  <dd className="font-mono font-bold">{order.productSku}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="font-semibold text-base-ink/60">{t("Qty")}</dt>
                <dd className="font-bold">{order.qty}x</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="font-semibold text-base-ink/60">{t("Harga Satuan")}</dt>
                <dd className="font-bold">{formatRupiah(order.unitPrice)}</dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-dashed border-base-line pt-2">
                <dt className="font-extrabold">{t("Total Dibayar")}</dt>
                <dd className="text-xl font-extrabold">{formatAmount(order)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
