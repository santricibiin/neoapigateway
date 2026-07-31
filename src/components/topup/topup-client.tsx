"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, Loader2, ReceiptText, RefreshCw, Sparkles, WalletCards, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import type { CreatedTopup, TopupTier, TopupTransaction } from "@/lib/bandelbanget";
import { cn } from "@/lib/utils";

function money(value?: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value ?? 0);
}

function number(value?: number) {
  return (value ?? 0).toLocaleString("id-ID");
}

function date(value?: number | null) {
  return value ? new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
}

function finalStatus(status?: string) {
  return ["settlement", "capture", "cancel", "expire", "deny", "failure"].includes(status || "");
}

function statusStyle(status: string) {
  if (["settlement", "capture"].includes(status)) return "bg-accent-mint";
  if (["cancel", "expire", "deny", "failure"].includes(status)) return "bg-red-200";
  return "bg-accent-sun";
}

function countdown(value: number) {
  const seconds = Math.max(0, Math.floor(value / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((item) => String(item).padStart(2, "0")).join(":");
}

declare global {
  interface Window {
    snap?: {
      embed: (token: string, options: { embedId: string; onSuccess: () => void; onPending: () => void; onError: () => void; onClose: () => void }) => void;
    };
  }
}

export function TopupClient({ tiers, initialTransactions, error: initialError }: { tiers: TopupTier[]; initialTransactions: TopupTransaction[]; error: string | null }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [error, setError] = useState(initialError);
  const [creating, setCreating] = useState<string | null>(null);
  const [payment, setPayment] = useState<CreatedTopup | null>(null);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [snapReady, setSnapReady] = useState(false);
  const pending = useMemo(() => transactions.find((item) => !finalStatus(item.status)), [transactions]);

  const loadHistory = useCallback(async () => {
    const response = await fetch("/dashboard/topup/api", { cache: "no-store" });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || "Gagal memperbarui transaksi");
    setTransactions(result.transactions);
    return result.transactions as TopupTransaction[];
  }, []);

  const checkOrder = useCallback(async (orderId: string) => {
    setChecking(true);
    try {
      const response = await fetch(`/dashboard/topup/api?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Gagal mengecek pembayaran");
      const next = await loadHistory();
      const transaction = next.find((item) => item.orderId === orderId);
      if (transaction && finalStatus(transaction.status)) setPayment(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengecek pembayaran");
    } finally {
      setChecking(false);
    }
  }, [loadHistory]);

  useEffect(() => {
    const orderId = payment?.orderId || pending?.orderId;
    if (!orderId) return;
    const interval = window.setInterval(() => void checkOrder(orderId), 5000);
    return () => window.clearInterval(interval);
  }, [checkOrder, payment?.orderId, pending?.orderId]);

  useEffect(() => {
    if (!payment) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [payment]);

  useEffect(() => {
    if (!payment?.snapToken || !payment.clientKey) return;
    setSnapReady(false);
    const existing = document.querySelector<HTMLScriptElement>('script[data-midtrans-snap="true"]');
    if (existing) {
      if (window.snap) setSnapReady(true);
      else existing.addEventListener("load", () => setSnapReady(true), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = payment.isProduction ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.dataset.clientKey = payment.clientKey;
    script.dataset.midtransSnap = "true";
    script.onload = () => setSnapReady(true);
    script.onerror = () => setError("Gagal memuat QRIS Midtrans");
    document.body.appendChild(script);
  }, [payment?.clientKey, payment?.isProduction, payment?.snapToken]);

  useEffect(() => {
    if (!payment?.snapToken || !snapReady || !window.snap) return;
    window.snap.embed(payment.snapToken, {
      embedId: "midtrans-snap-container",
      onSuccess: () => void checkOrder(payment.orderId),
      onPending: () => void checkOrder(payment.orderId),
      onError: () => void checkOrder(payment.orderId),
      onClose: () => undefined,
    });
  }, [checkOrder, payment?.orderId, payment?.snapToken, snapReady]);

  async function create(tierId: string) {
    setCreating(tierId);
    setError(null);
    try {
      const response = await fetch("/dashboard/topup/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tierId }) });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Gagal membuat topup");
      setPayment(result.topup);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat topup");
    } finally {
      setCreating(null);
    }
  }

  return (
    <div className="w-full space-y-5">
      <Modal open={Boolean(payment)} onClose={() => setPayment(null)} title="Pembayaran QRIS" className="max-h-[95vh] max-w-xl overflow-y-auto">
        {payment && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-neo border-2 border-base-ink bg-accent-sun/30 p-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-base-ink/50">Selesaikan sebelum</p>
                <p className="font-mono text-2xl font-black">{countdown(Math.max(0, (payment.expiryAt ?? now) - now))}</p>
              </div>
              <Clock3 className="h-7 w-7" />
            </div>
            <p className="break-all text-center font-mono text-[10px] font-bold text-base-ink/45">{payment.orderId}</p>
            {payment.snapToken ? (
              <div className="min-h-[440px] overflow-hidden rounded-neo border-2 border-base-ink bg-white">
                {!snapReady && <div className="flex min-h-[440px] items-center justify-center gap-2 text-sm font-bold"><Loader2 className="h-5 w-5 animate-spin" /> Memuat QRIS...</div>}
                <div id="midtrans-snap-container" />
              </div>
            ) : payment.redirectUrl ? (
              <div className="rounded-neo border-2 border-base-ink bg-base-bg p-5 text-center">
                <p className="text-sm font-bold">QRIS tersedia di halaman pembayaran.</p>
                <a href={payment.redirectUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-sky px-4 py-2 text-sm font-extrabold shadow-neo-sm">Buka QRIS <ExternalLink className="h-4 w-4" /></a>
              </div>
            ) : null}
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-base-ink/50">
              {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Status diperiksa otomatis setiap 5 detik
            </div>
          </div>
        )}
      </Modal>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-mint shadow-neo-sm"><WalletCards className="h-5 w-5" /></span>
          <div><h1 className="text-2xl font-extrabold">Topup Token</h1><p className="text-xs font-semibold text-base-ink/55">Pembayaran aman via QRIS / Midtrans</p></div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadHistory()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {error && <div className="rounded-neo border-2 border-base-ink bg-red-100 p-3 text-sm font-bold text-red-700">{error}</div>}

      {(payment || pending) && (
        <Card className="bg-accent-sun/25">
          <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-sun"><Clock3 className="h-5 w-5" /></span>
              <div><p className="font-extrabold">Menunggu Pembayaran</p><p className="font-mono text-xs text-base-ink/55">{payment?.orderId || pending?.orderId}</p><p className="mt-1 text-[11px] font-bold text-base-ink/45">Status dicek otomatis setiap 5 detik</p></div>
            </div>
            <div className="flex gap-2">
              {payment?.redirectUrl && <a href={payment.redirectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-sky px-3 py-2 text-xs font-extrabold shadow-neo-sm">Bayar Sekarang <ExternalLink className="h-3.5 w-3.5" /></a>}
              <Button variant="outline" size="sm" disabled={checking} onClick={() => void checkOrder((payment?.orderId || pending?.orderId)!)}>{checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Cek</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier) => {
          const discount = (tier.flashSaleDiscount ?? 0) > 0;
          const price = discount ? tier.flashSalePrice ?? tier.resellerPrice : tier.resellerPrice;
          return <Card key={tier.id} hover className={cn("relative overflow-hidden", discount && "bg-accent-sun/20")}>
            {discount && <span className="absolute right-0 top-0 rounded-bl-neo border-b-2 border-l-2 border-base-ink bg-red-400 px-3 py-1 text-[10px] font-extrabold text-white">HEMAT {tier.flashSaleDiscount}%</span>}
            <CardContent className="p-5">
              <div className="flex items-start justify-between"><div><p className="text-3xl font-black">{tier.label}</p><p className="text-xs font-bold text-base-ink/45">{number(tier.tokens)} token</p></div><Sparkles className="h-5 w-5 text-amber-500" /></div>
              <div className="my-4 border-y-2 border-dashed border-base-ink/20 py-3"><p className="text-2xl font-black">{money(price)}</p>{discount && <p className="text-xs font-bold text-base-ink/40 line-through">{money(tier.resellerPrice)}</p>}</div>
              <p className="min-h-10 text-xs font-semibold text-base-ink/60">{tier.description || `Paket reseller ${tier.label}`}</p>
              <Button variant="primary" className="mt-4 w-full" disabled={Boolean(creating) || Boolean(payment || pending)} onClick={() => void create(tier.id)}>{creating === tier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />} Pilih Paket</Button>
            </CardContent>
          </Card>;
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-4 w-4" /> Riwayat Topup</CardTitle></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-y-2 border-base-ink bg-base-ink text-xs uppercase text-white"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Paket</th><th className="px-4 py-3">Pembayaran</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tanggal</th></tr></thead><tbody className="divide-y-2 divide-base-ink/15">{transactions.slice(0, 10).map((item) => <tr key={item.orderId} className="hover:bg-accent-sky/10"><td className="px-4 py-3"><p className="font-mono text-xs font-bold">{item.orderId}</p></td><td className="px-4 py-3"><p className="font-extrabold">{number(item.tokens)} token</p><p className="text-xs text-base-ink/45">{item.tierId}</p></td><td className="px-4 py-3 font-extrabold">{money(item.grossAmount ?? item.amount)}</td><td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1 rounded-full border-2 border-base-ink px-2.5 py-1 text-[10px] font-extrabold uppercase", statusStyle(item.status))}>{["settlement", "capture"].includes(item.status) ? <CheckCircle2 className="h-3.5 w-3.5" /> : finalStatus(item.status) ? <XCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{item.status}</span></td><td className="px-4 py-3 text-xs font-semibold">{date(item.createdAt)}</td></tr>)}</tbody></table></div>{transactions.length === 0 && <p className="py-10 text-center text-sm font-bold text-base-ink/45">Belum ada transaksi topup.</p>}</CardContent>
      </Card>
    </div>
  );
}