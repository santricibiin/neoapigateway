"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { useT } from "@/lib/lang";
import { Search, Receipt, ShieldCheck, Clock, Zap } from "lucide-react";

export default function TrackPage() {
  const router = useRouter();
  const t = useT();
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = invoice.trim().toUpperCase();
    if (!trimmed) {
      setError(t("Masukkan nomor invoice"));
      return;
    }
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="relative flex min-h-[70vh] flex-col gap-8 overflow-x-hidden py-6 sm:py-8">
      <FloatingShapes />

      <section className="relative flex flex-col items-center gap-3 pt-4 text-center sm:pt-8">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="rounded-neo border-2 border-base-ink bg-accent-sun px-4 py-1.5 text-sm font-bold shadow-neo-sm"
        >
          <Receipt className="mr-1.5 inline-block h-4 w-4" />
          {t("Cek Pesanan")}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
        >
          {t("Lacak Pesanan Anda")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-xl text-sm text-base-ink/70 sm:text-base"
        >
          {t("Masukkan nomor invoice untuk melihat detail pesanan & produk.")}
        </motion.p>
      </section>

      <section className="relative mx-auto w-full max-w-xl">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col gap-3 rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo sm:p-6"
        >
          <label className="text-sm font-bold" htmlFor="invoice">
            {t("No. Invoice")}
          </label>
          <Input
            id="invoice"
            type="text"
            placeholder="INV-XXXX-XXXX"
            value={invoice}
            onChange={(e) => {
              setInvoice(e.target.value.toUpperCase());
              setError(null);
            }}
            className="text-center font-mono font-bold"
            autoFocus
          />
          {error && (
            <p className="text-center text-xs font-semibold text-red-600">{error}</p>
          )}
          <Button type="submit" variant="primary" size="lg" className="w-full">
            <Search className="h-5 w-5" />
            {t("Lacak Pesanan")}
          </Button>
        </motion.form>
      </section>

      <section className="relative mx-auto grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {[
          { icon: Clock, titleId: "Real-time", descId: "Status pesanan diperbarui otomatis setiap beberapa detik." },
          { icon: ShieldCheck, titleId: "Aman", descId: "Nomor invoice bersifat rahasia — hanya Anda yang bisa melihat detailnya." },
          { icon: Zap, titleId: "Instan", descId: "Produk dikirim otomatis begitu pembayaran terkonfirmasi." },
        ].map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.titleId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
              className="flex flex-col items-center gap-2 rounded-neo border-2 border-base-ink bg-base-surface p-4 text-center shadow-neo-sm"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky shadow-neo-sm">
                <Icon className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <p className="text-sm font-extrabold">{t(f.titleId)}</p>
              <p className="text-xs font-semibold text-base-ink/55">{t(f.descId)}</p>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
