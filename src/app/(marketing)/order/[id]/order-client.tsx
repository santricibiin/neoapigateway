"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { createOrder, cancelOrder } from "@/app/actions/payment";
import { useT } from "@/lib/lang";
import { countPendingOrders, MAX_PENDING_ORDERS, readOrderHistory, removeOrderHistory, saveOrderHistory, updateOrderHistory, type OrderHistoryItem } from "@/lib/order-history";
import {
  ArrowLeft,
  Loader2,
} from "lucide-react";

// Custom SVG Icons
const ShoppingCartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d="M2 2h1.5l.3 1.5M7 13h10l4-8H5.5M7 13L5.5 3.5M7 13l-2 6h14l-2-6M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12">
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const XCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12">
    <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 9l6 6m0-6l-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const CopyIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const TagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" stroke="currentColor" strokeWidth="2"/>
    <path d="M21 10h-5a2 2 0 00-2 2v0a2 2 0 002 2h5" stroke="currentColor" strokeWidth="2"/>
    <circle cx="17" cy="12" r="1" fill="currentColor"/>
  </svg>
);

const ReceiptIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2z" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

interface Product {
  id: number;
  name: string;
  model: string;
  description: string;
  price: number;
  sku: string | null;
  category: string;
  stockMode: string;
  stock: number;
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

type PayMethods = { qris: boolean; binancepay: boolean; usdtNetworks: string[] };
type PayMethodChoice = { kind: "qris" } | { kind: "binancepay" } | { kind: "usdt"; network: string };

function usdtOf(idr: number, rate: number) {
  if (!rate) return null;
  return (idr / rate).toFixed(2);
}

export function OrderClient({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<OrderHistoryItem[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [payMethods, setPayMethods] = useState<PayMethods | null>(null);
  const [method, setMethod] = useState<PayMethodChoice>({ kind: "qris" });
  const [usdtRate, setUsdtRate] = useState(0);

  useEffect(() => {
    void fetch("/api/public/pay-methods", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (data.ok) {
          setPayMethods(data.methods);
          if (typeof data.usdtRate === "number" && data.usdtRate > 0) setUsdtRate(data.usdtRate);
          if (data.methods.qris) setMethod({ kind: "qris" });
          else if (data.methods.binancepay) setMethod({ kind: "binancepay" });
          else if (data.methods.usdtNetworks?.length) setMethod({ kind: "usdt", network: data.methods.usdtNetworks[0] });
        }
      })
      .catch(() => {});
  }, []);

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Rate limiting: maksimal 3 pesanan pending per user (device).
    if (countPendingOrders() >= MAX_PENDING_ORDERS) {
      setError(
        `${t("Anda punya")} ${MAX_PENDING_ORDERS} ${t("pesanan belum dibayar. Lunasi atau batalkan lewat Riwayat sebelum membuat pesanan baru.")}`
      );
      setHistory(readOrderHistory());
      setHistoryOpen(true);
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.set("tokenId", String(product.id));
    formData.set("qty", String(qty));
    formData.set("payMethod", method.kind);
    if (method.kind === "usdt") formData.set("network", method.network);

    const res = await createOrder(formData);
    setLoading(false);

    if (!res.ok || !res.data) {
      setError(res.error ?? t("Gagal membuat order"));
      return;
    }

    const o = res.data;

    saveOrderHistory({
      invoice: o.invoice,
      productName: product.name,
      amount: o.amount,
      createdAt: Date.now(),
      status: "pending",
    });

    // Arahkan ke halaman pembayaran khusus (bukan modal).
    router.push(`/pay/${encodeURIComponent(o.invoice)}`);
  }

  const isExternal = product.stockMode === "external";

  function openHistory() {
    setHistory(readOrderHistory());
    setHistoryOpen(true);
  }

  async function cancelPendingOrder(invoice: string) {
    setCancelling(invoice);
    try {
      const res = await cancelOrder(invoice);
      if (res.ok) {
        removeOrderHistory(invoice);
      } else {
        // Sudah diproses/tidak ketemu di server — tetap bersihkan dari riwayat lokal.
        updateOrderHistory(invoice, "expired");
      }
      setHistory(readOrderHistory());
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col gap-6 overflow-x-hidden py-6 sm:gap-8 sm:py-8">
      <FloatingShapes />
      <div className="relative">
        <Link href="/products" className="inline-flex items-center gap-2 text-sm font-bold text-base-ink/70 hover:text-base-ink">
          <ArrowLeft className="h-4 w-4" />
          {t("Kembali ke Produk")}
        </Link>
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        {/* Kolom kiri: produk + form */}
        <div className="flex flex-col gap-5">
          <div className="rounded-neo border border-base-line bg-base-surface p-5 shadow-neo sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-base-line bg-base-bg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-base-ink/60">
                {product.category}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-base-line bg-accent-skySoft px-2 py-0.5 text-[10px] font-black uppercase">
                <TagIcon />
                {product.model}
              </span>
              {product.sku && (
                <span className="ml-auto rounded-neo border border-base-line bg-base-bg px-2 py-1 font-mono text-[10px] font-bold text-base-ink/60">
                  {product.sku}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{product.name}</h1>
            {product.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-base-ink/70">{product.description}</p>
            )}
            <div className="mt-4 flex items-end justify-between gap-3 border-t border-dashed border-base-line pt-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-base-ink/40">{t("Harga satuan")}</div>
                <div className="text-2xl font-extrabold sm:text-3xl">{formatRupiah(product.price)}</div>
                {usdtOf(product.price, usdtRate) && (
                  <div className="font-mono text-xs font-bold text-base-ink/45">≈ {usdtOf(product.price, usdtRate)} USDT</div>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border border-base-line px-2.5 py-1 text-[10px] font-black uppercase ${
                  isExternal || product.stock > 0 ? "bg-accent-mint" : "bg-accent-terraSoft"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isExternal || product.stock > 0 ? "bg-accent-sageDeep" : "bg-[#B4522E]"}`} />
                {isExternal ? t("Tersedia") : product.stock > 0 ? `${product.stock} ${t("tersedia")}` : t("Habis")}
              </span>
            </div>
          </div>

          <form onSubmit={handleCreateOrder} className="flex flex-col gap-4">
            {!isExternal && (
              <div className="rounded-neo border border-base-line bg-base-surface p-5 shadow-neo sm:p-6">
                <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <ShoppingCartIcon />
                  {t("Jumlah")}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-neo border border-base-line bg-base-bg font-bold shadow-neo-sm"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 rounded-neo border border-base-line bg-base-surface py-2 text-center font-bold shadow-neo-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-neo border border-base-line bg-base-bg font-bold shadow-neo-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {payMethods && (payMethods.binancepay || payMethods.usdtNetworks.length > 0) && (
              <div className="rounded-neo border border-base-line bg-base-surface p-5 shadow-neo sm:p-6">
                <label className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <WalletIcon />
                  {t("Metode Pembayaran")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {payMethods.qris && (
                    <button type="button" onClick={() => setMethod({ kind: "qris" })} className={`rounded-neo border-2 px-3 py-2 text-xs font-black ${method.kind === "qris" ? "border-base-ink bg-accent-sky" : "border-base-line bg-base-bg"}`}>
                      QRIS
                    </button>
                  )}
                  {payMethods.binancepay && (
                    <button type="button" onClick={() => setMethod({ kind: "binancepay" })} className={`rounded-neo border-2 px-3 py-2 text-xs font-black ${method.kind === "binancepay" ? "border-base-ink bg-accent-sun" : "border-base-line bg-base-bg"}`}>
                      Binance Pay
                    </button>
                  )}
                  {payMethods.usdtNetworks.map((net) => (
                    <button key={net} type="button" onClick={() => setMethod({ kind: "usdt", network: net })} className={`rounded-neo border-2 px-3 py-2 text-xs font-black ${method.kind === "usdt" && method.network === net ? "border-base-ink bg-accent-mint" : "border-base-line bg-base-bg"}`}>
                      USDT {net}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-neo border border-base-line bg-accent-terraSoft px-4 py-3 text-sm font-semibold text-accent-terraDeep">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" variant="primary" size="lg" disabled={loading} className="flex-1">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <WalletIcon />}
                {loading ? t("Membuat Invoice...") : t("Lanjutkan Pembayaran")}
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={openHistory}>
                <ReceiptIcon />
                {t("Riwayat")}
              </Button>
            </div>
          </form>
        </div>

        {/* Kolom kanan: ringkasan + cara bayar */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-neo border border-base-line bg-base-surface p-5 shadow-neo sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-base-ink/50">
              <ReceiptIcon className="h-4 w-4" />
              {t("Ringkasan Pesanan")}
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="font-semibold text-base-ink/60">{t("Produk")}</dt>
                <dd className="text-right font-bold">{product.name}</dd>
              </div>
              {!isExternal && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-semibold text-base-ink/60">{t("Jumlah")}</dt>
                  <dd className="font-bold">{qty}x</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <dt className="font-semibold text-base-ink/60">{t("Harga satuan")}</dt>
                <dd className="font-bold">{formatRupiah(product.price)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-dashed border-base-line pt-2">
                <dt className="font-extrabold">{t("Total")}</dt>
                <dd className="text-right">
                  <span className="text-lg font-extrabold">{formatRupiah(product.price * (isExternal ? 1 : qty))}</span>
                  {usdtOf(product.price * (isExternal ? 1 : qty), usdtRate) && (
                    <span className="block font-mono text-[11px] font-bold text-base-ink/45">≈ {usdtOf(product.price * (isExternal ? 1 : qty), usdtRate)} USDT</span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] font-semibold text-base-ink/45">
              {t("Total akhir ditambah kode unik untuk verifikasi otomatis.")}
            </p>
          </div>

          <div className="rounded-neo border border-base-line bg-base-surface p-5 shadow-neo sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-base-ink/50">
              <ClockIcon />
              {t("Cara Pembayaran")}
            </h2>
            <ol className="mt-3 space-y-3">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo border border-base-line bg-accent-sky text-xs font-black">1</span>
                <p className="text-sm font-semibold text-base-ink/70">{t("Klik")} <span className="font-extrabold text-base-ink">{t("Lanjutkan Pembayaran")}</span> {t("— invoice QRIS dibuat instan.")}</p>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo border border-base-line bg-accent-sky text-xs font-black">2</span>
                <p className="text-sm font-semibold text-base-ink/70">{t("Scan QRIS dari e-wallet/m-banking mana pun, bayar")} <span className="font-extrabold text-base-ink">{t("tepat sesuai nominal.")}</span></p>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-neo border border-base-line bg-accent-sky text-xs font-black">3</span>
                <p className="text-sm font-semibold text-base-ink/70">{t("Pembayaran terdeteksi otomatis — detail produk langsung tampil di halaman ini.")}</p>
              </li>
            </ol>
            <div className="mt-4 rounded-neo border border-base-line bg-accent-sunSoft p-3">
              <p className="text-xs font-bold text-base-ink/70">
                {t("Semua aktivitas pembayaran dipantau 24 jam dan invoice berlaku 10 menit.")}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={t("Riwayat Pesanan")}
        className="w-[calc(100vw-2rem)] max-w-sm"
      >
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-base-ink/60">
            {t("Belum ada riwayat pesanan.")}
          </p>
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {history.map((item) => (
              <div
                key={item.invoice}
                className="rounded-neo border border-base-line bg-base-bg p-3 shadow-neo-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/track/${item.invoice}`} className="min-w-0 flex-1">
                    <span className="break-all font-mono text-xs font-bold">{item.invoice}</span>
                  </Link>
                  <span
                    className={`shrink-0 rounded-neo border border-base-line px-2 py-0.5 text-[10px] font-bold ${
                      item.status === "paid"
                        ? "bg-accent-mint"
                        : item.status === "expired" || item.status === "failed"
                          ? "bg-accent-sun"
                          : "bg-base-surface"
                    }`}
                  >
                    {item.status === "paid"
                      ? t("Lunas")
                      : item.status === "expired" || item.status === "failed"
                        ? t("Kedaluwarsa")
                        : t("Pending")}
                  </span>
                </div>
                <div className="mt-1 break-words text-sm font-bold">{item.productName}</div>
                <div className="mt-0.5 break-words text-xs text-base-ink/60">
                  {formatRupiah(item.amount)} ·{" "}
                  {new Date(item.createdAt).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
                {item.status === "pending" ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Link href={`/pay/${item.invoice}`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full">
                        {t("Bayar")}
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-accent-terraSoft hover:text-accent-terraDeep"
                      disabled={cancelling === item.invoice}
                      onClick={() => void cancelPendingOrder(item.invoice)}
                    >
                      {cancelling === item.invoice ? t("Membatalkan...") : t("Batalkan")}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
