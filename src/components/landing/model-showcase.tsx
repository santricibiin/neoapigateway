"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

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

const PAGE_SIZE = 10;

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

  const models = [...(data?.models ?? [])].sort((a, b) =>
    a.brand.localeCompare(b.brand) || a.id.localeCompare(b.id)
  );
  const stats = data?.stats ?? { totalActive: 0, totalModels: 0, totalBrands: 0 };
  const totalPages = Math.max(1, Math.ceil(models.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageModels = models.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Model AI Tersedia</h2>
        <p className="mt-1 text-sm text-base-ink/60">
          {stats.totalActive} model siap pakai · Update realtime dari BandelBanget
        </p>
      </div>

      {models.length === 0 ? (
        <p className="py-8 text-center text-sm text-base-ink/50">Gagal memuat data model.</p>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-base-ink bg-base-bg text-xs font-black uppercase tracking-wider text-base-ink/70">
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3 text-center">Multiplier</th>
                  <th className="px-4 py-3 text-center">Vision</th>
                  <th className="px-4 py-3">Modality</th>
                </tr>
              </thead>
              <tbody>
                {pageModels.map((model, i) => (
                  <tr
                    key={model.id}
                    className={`border-b border-base-ink/10 ${i % 2 === 0 ? "bg-base-surface" : "bg-base-bg/50"}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-extrabold sm:text-sm">{model.id}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold">{model.brand}</td>
                    <td className="px-4 py-3 text-center font-mono font-black">{model.multiplier}x</td>
                    <td className="px-4 py-3 text-center">
                      {model.vision ? (
                        <span className="inline-flex items-center gap-1 rounded-neo border-2 border-base-ink bg-accent-mint px-1.5 py-0.5 text-[10px] font-black uppercase text-base-ink shadow-neo-sm">
                          <Eye className="h-3.5 w-3.5" strokeWidth={2.5} /> Vision
                        </span>
                      ) : (
                        <EyeOff className="mx-auto h-4 w-4 text-base-ink/25" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-base-ink/60">
                      {model.input.join(" + ")} → {model.output.join(" + ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t-2 border-base-ink bg-base-bg px-4 py-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-neo border-2 border-base-ink bg-base-surface px-3 py-1.5 text-xs font-bold shadow-neo-sm transition-shadow hover:shadow-neo-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} /> Sebelumnya
              </button>
              <span className="text-xs font-black text-base-ink/70">
                Halaman {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-neo border-2 border-base-ink bg-base-surface px-3 py-1.5 text-xs font-bold shadow-neo-sm transition-shadow hover:shadow-neo-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          ) : null}
        </motion.div>
      )}
    </div>
  );
}
