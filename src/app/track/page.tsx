"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { Search, Receipt } from "lucide-react";

export default function TrackPage() {
  const router = useRouter();
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = invoice.trim().toUpperCase();
    if (!trimmed) {
      setError("Masukkan nomor invoice");
      return;
    }
    router.push(`/track/${trimmed}`);
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 overflow-x-hidden px-4 py-8">
      <FloatingShapes />

      <div className="relative w-full rounded-neo border-2 border-base-ink bg-base-surface p-6 shadow-neo sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky shadow-neo-sm">
            <Receipt className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-extrabold sm:text-2xl">Cek Pesanan</h1>
          <p className="text-sm text-base-ink/60">
            Masukkan nomor invoice untuk melihat detail pesanan & produk.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="text"
            placeholder="INV…"
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
            Lacak Pesanan
          </Button>
        </form>
      </div>
    </div>
  );
}
