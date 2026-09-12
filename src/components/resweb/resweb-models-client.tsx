"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Eye, EyeOff, Loader2, Search, Sparkles, Zap, ZapOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Model = { id: string; brand: string; enabled: boolean; vision: boolean; grade: string; multiplier: number; input: string[]; output: string[] };

type Filter = "all" | "active" | "inactive";

export function ReswebModelsClient() {
  const [models, setModels] = useState<Model[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/public/models", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Gagal memuat model");
        setModels(data.models || []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Gagal memuat model"))
      .finally(() => setLoading(false));
  }, []);

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  const stats = useMemo(() => ({
    total: models.length,
    active: models.filter((m) => m.enabled).length,
    inactive: models.filter((m) => !m.enabled).length,
  }), [models]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return models.filter((model) => {
      if (filter === "active" && !model.enabled) return false;
      if (filter === "inactive" && model.enabled) return false;
      return `${model.id} ${model.brand}`.toLowerCase().includes(q);
    });
  }, [models, query, filter]);

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-neo border border-base-line bg-accent-mint p-5 shadow-neo sm:p-7">
        <motion.svg animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 text-white/35"><path d="M50 5 61 38 95 39 68 58 77 91 50 72 23 91 32 58 5 39 39 38Z" fill="currentColor" /></motion.svg>
        <div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-base-line bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"><Sparkles className="h-3 w-3" /> Realtime Catalog</span><h1 className="mt-3 text-3xl font-black sm:text-4xl">Katalog model.</h1><p className="mt-1 text-sm font-bold text-base-ink/60">{stats.active} aktif · {stats.inactive} nonaktif · {stats.total} total</p></div>
      </motion.section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["active", "all", "inactive"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-neo border border-base-line px-3 py-2 text-xs font-black uppercase transition-colors",
                filter === f ? "bg-base-ink text-white shadow-neo-sm" : "bg-white hover:bg-accent-sky/20"
              )}
            >
              {f === "active" ? <Zap className="h-3.5 w-3.5" /> : f === "inactive" ? <ZapOff className="h-3.5 w-3.5" /> : null}
              {f === "active" ? "Aktif" : f === "inactive" ? "Nonaktif" : "Semua"}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[9px]", filter === f ? "bg-white/20" : "bg-base-bg")}>{f === "active" ? stats.active : f === "inactive" ? stats.inactive : stats.total}</span>
            </button>
          ))}
        </div>
        <div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-base-ink/45" /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau brand model..." /></div>
      </div>

      {loading ? <div className="flex items-center gap-2 rounded-neo border border-base-line bg-white p-4 font-bold"><Loader2 className="h-4 w-4 animate-spin" /> Memuat model...</div> : null}
      {error ? <p className="rounded-neo border border-base-line bg-accent-terraSoft p-4 text-sm font-bold">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((model, index) => (
          <motion.button
            key={model.id}
            type="button"
            onClick={() => void copy(model.id)}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 12) * 0.035 }}
            whileHover={{ y: -5, rotate: index % 2 ? 0.35 : -0.35 }}
            className={cn(
              "relative min-h-40 overflow-hidden rounded-neo border border-base-line p-4 text-left shadow-neo-sm",
              !model.enabled && "opacity-60",
              model.enabled ? (index % 3 === 0 ? "bg-accent-sky" : index % 3 === 1 ? "bg-accent-sun" : "bg-white") : "bg-base-bg"
            )}
          >
            <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -bottom-9 -right-9 h-28 w-28 text-base-ink/10"><circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="12" /></svg>
            <div className="relative flex items-start justify-between gap-3">
              <span className={cn("inline-flex items-center gap-1 rounded-full border border-base-line px-2 py-0.5 text-[9px] font-black uppercase", model.enabled ? "bg-accent-mint" : "bg-accent-terraSoft")}>
                {model.enabled ? <Zap className="h-2.5 w-2.5" /> : <ZapOff className="h-2.5 w-2.5" />}
                {model.enabled ? "Aktif" : "Nonaktif"}
              </span>
              <span className="font-mono text-xs font-black">{model.multiplier}x</span>
            </div>
            <p className="relative mt-5 break-all font-mono text-sm font-black">{model.id}</p>
            <div className="relative mt-4 flex items-center justify-between text-[10px] font-bold uppercase text-base-ink/55">
              <span className="flex items-center gap-1">{model.vision ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{model.vision ? "Vision" : "Text"} · {model.brand}</span>
              <span className="flex items-center gap-1">{copied === model.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied === model.id ? "Tersalin" : "Copy"}</span>
            </div>
          </motion.button>
        ))}
      </div>
      {!loading && !error && !filtered.length ? <div className="rounded-neo border border-dashed border-base-line bg-white py-14 text-center font-bold text-base-ink/45">Model tidak ditemukan.</div> : null}
    </div>
  );
}
