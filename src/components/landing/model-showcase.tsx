"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Eye, Loader2 } from "lucide-react";

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

export function ModelShowcase() {
  const [data, setData] = useState<ModelsData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const models = data?.models ?? [];
  const stats = data?.stats ?? { totalActive: 0, totalModels: 0, totalBrands: 0 };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Model AI Tersedia</h2>
        <p className="mt-1 text-sm text-base-ink/60">
          {stats.totalActive} aktif dari {stats.totalModels} model · Update realtime dari BandelBanget
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
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Grade</th>
                  <th className="px-4 py-3 text-center">Multiplier</th>
                  <th className="px-4 py-3 text-center">Vision</th>
                  <th className="px-4 py-3">Modality</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model, i) => (
                  <tr
                    key={model.id}
                    className={`border-b border-base-ink/10 ${i % 2 === 0 ? "bg-base-surface" : "bg-base-bg/50"} ${!model.enabled ? "opacity-55" : ""}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-extrabold sm:text-sm">{model.id}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold">{model.brand}</td>
                    <td className="px-4 py-3 text-center">
                      {model.enabled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                          <Check className="h-3.5 w-3.5" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
                          <X className="h-3.5 w-3.5" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-black">{model.grade}</td>
                    <td className="px-4 py-3 text-center font-mono font-black">{model.multiplier}x</td>
                    <td className="px-4 py-3 text-center">
                      {model.vision ? (
                        <Eye className="mx-auto h-4 w-4 text-base-ink/70" />
                      ) : (
                        <span className="text-base-ink/30">—</span>
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
        </motion.div>
      )}
    </div>
  );
}
