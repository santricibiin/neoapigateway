"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface ModelDetail {
  id: string;
  brand: string;
  enabled: boolean;
  vision: boolean;
  grade: string;
  multiplier: number;
  input: string[];
  output: string[];
}

interface ModelsData {
  ok: boolean;
  models: ModelDetail[];
  stats: { totalActive: number; totalModels: number; totalBrands: number };
}

const PAGE_SIZE = 12;

/** Varian "-b" disembunyikan di landing. Dicocokkan sebagai akhiran agar `auto-debug` tetap tampil. */
function isHiddenVariant(id: string) {
  return /-b$/i.test(id.trim());
}

/** Claude lalu GPT paling awal, sisanya menyusul. */
function brandRank(id: string) {
  const lower = id.trim().toLowerCase();
  if (lower.startsWith("claude")) return 0;
  if (lower.startsWith("gpt")) return 1;
  return 2;
}

/** Warna dot per brand (selaras dengan yang dipakai server). */
const BRAND_COLORS: Record<string, string> = {
  Claude: "#D97757",
  GPT: "#10A37F",
  DeepSeek: "#4D6BFE",
  GLM: "#3B82F6",
  Kimi: "#1A1A1A",
  Mistral: "#FF7000",
  Qwen: "#6E56CF",
  MiMo: "#F59E0B",
  Hy3: "#8B5CF6",
  Llama: "#0866FF",
};

function brandColor(brand: string) {
  return BRAND_COLORS[brand] ?? "#64748B";
}

const grid = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const cell = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export function ModelShowcase() {
  const [data, setData] = useState<ModelsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/public/models")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ ok: false, models: [], stats: { totalActive: 0, totalModels: 0, totalBrands: 0 } }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-base-ink/40" />
      </div>
    );
  }

  const models = (data?.models ?? [])
    .filter((model) => !isHiddenVariant(model.id))
    .sort((a, b) => brandRank(a.id) - brandRank(b.id) || a.id.localeCompare(b.id));
  const totalActive = models.filter((model) => model.enabled).length;
  const totalPages = Math.max(1, Math.ceil(models.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageModels = models.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Model AI Tersedia</h2>
        <p className="mt-1 text-sm text-base-ink/60">
          {totalActive} model siap pakai · Update realtime
        </p>
      </div>

      {models.length === 0 ? (
        <p className="py-8 text-center text-sm text-base-ink/50">Gagal memuat data model.</p>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={grid}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          key={safePage}
        >
          {pageModels.map((model) => (
            <motion.div
              key={model.id}
              variants={cell}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="flex flex-col rounded-neo border-2 border-base-ink bg-base-surface p-4 shadow-neo-sm transition-shadow hover:shadow-neo"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-extrabold" title={model.id}>
                    {model.id}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-base-ink/60">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-base-ink/20"
                      style={{ backgroundColor: brandColor(model.brand) }}
                    />
                    {model.brand}
                  </span>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-base-ink px-2 py-0.5 text-[10px] font-black uppercase ${
                    model.enabled ? "bg-accent-mint" : "bg-red-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${model.enabled ? "bg-green-600" : "bg-red-500"}`} />
                  {model.enabled ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t-2 border-dashed border-base-ink/15 pt-3">
                <span className="rounded-neo border-2 border-base-ink bg-base-bg px-1.5 py-0.5 font-mono text-[10px] font-black">
                  {model.multiplier}x
                </span>
                {model.grade && model.grade !== "-" ? (
                  <span className="rounded-neo border-2 border-base-ink bg-accent-sunSoft px-1.5 py-0.5 text-[10px] font-black uppercase">
                    Grade {model.grade}
                  </span>
                ) : null}
                {model.vision ? (
                  <span className="inline-flex items-center gap-1 rounded-neo border-2 border-base-ink bg-accent-skySoft px-1.5 py-0.5 text-[10px] font-black uppercase">
                    <Eye className="h-3 w-3" strokeWidth={2.5} /> Vision
                  </span>
                ) : null}
                <span className="ml-auto font-mono text-[10px] font-semibold text-base-ink/40">
                  {model.input.join("+")} → {model.output.join("+")}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {models.length > 0 && totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="inline-flex items-center gap-1 rounded-neo border-2 border-base-ink bg-base-surface px-3 py-1.5 text-xs font-bold shadow-neo-sm transition-shadow hover:shadow-neo disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} /> Sebelumnya
          </button>
          <span className="text-xs font-black text-base-ink/70">
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="inline-flex items-center gap-1 rounded-neo border-2 border-base-ink bg-base-surface px-3 py-1.5 text-xs font-bold shadow-neo-sm transition-shadow hover:shadow-neo disabled:cursor-not-allowed disabled:opacity-40"
          >
            Berikutnya <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
