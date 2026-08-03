"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Eye, Loader2, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";

type Model = { id: string; brand: string; enabled: boolean; vision: boolean; grade: string; multiplier: number; input: string[]; output: string[] };

export function ReswebModelsClient() {
  const [models, setModels] = useState<Model[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/public/models", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Gagal memuat model");
        setModels((data.models || []).filter((model: Model) => model.enabled));
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

  const filtered = models.filter((model) => `${model.id} ${model.brand}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-accent-mint p-5 shadow-neo sm:p-7">
        <motion.svg animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 text-white/35"><path d="M50 5 61 38 95 39 68 58 77 91 50 72 23 91 32 58 5 39 39 38Z" fill="currentColor" /></motion.svg>
        <div className="relative"><span className="inline-flex items-center gap-2 rounded-full border-2 border-base-ink bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"><Sparkles className="h-3 w-3" /> Live Catalog</span><h1 className="mt-3 text-3xl font-black sm:text-4xl">Model aktif.</h1><p className="mt-1 text-sm font-bold text-base-ink/60">{models.length} model tersedia untuk member Anda.</p></div>
      </motion.section>

      <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-base-ink/45" /><Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau brand model..." /></div>
      {loading ? <div className="flex items-center gap-2 rounded-neo border-2 border-base-ink bg-white p-4 font-bold"><Loader2 className="h-4 w-4 animate-spin" /> Memuat model...</div> : null}
      {error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-4 text-sm font-bold">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((model, index) => <motion.button key={model.id} type="button" onClick={() => void copy(model.id)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 12) * 0.035 }} whileHover={{ y: -5, rotate: index % 2 ? 0.35 : -0.35 }} className={`relative min-h-40 overflow-hidden rounded-neo border-2 border-base-ink p-4 text-left shadow-neo-sm ${index % 3 === 0 ? "bg-accent-sky" : index % 3 === 1 ? "bg-accent-sun" : "bg-white"}`}><svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -bottom-9 -right-9 h-28 w-28 text-base-ink/10"><circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="12" /></svg><div className="relative flex items-start justify-between gap-3"><span className="rounded-full border-2 border-base-ink bg-accent-mint px-2 py-0.5 text-[9px] font-black uppercase">Aktif</span><span className="font-mono text-xs font-black">{model.multiplier}x</span></div><p className="relative mt-5 break-all font-mono text-sm font-black">{model.id}</p><div className="relative mt-4 flex items-center justify-between text-[10px] font-bold uppercase text-base-ink/55"><span className="flex items-center gap-1">{model.vision ? <Eye className="h-3 w-3" /> : null}{model.vision ? "Vision" : "Text"} · {model.brand}</span><span className="flex items-center gap-1">{copied === model.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied === model.id ? "Tersalin" : "Copy"}</span></div></motion.button>)}
      </div>
      {!loading && !error && !filtered.length ? <div className="rounded-neo border-2 border-dashed border-base-ink bg-white py-14 text-center font-bold text-base-ink/45">Model tidak ditemukan.</div> : null}
    </div>
  );
}
