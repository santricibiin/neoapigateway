"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, KeyRound, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ResellerKey } from "@/lib/bandelbanget";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type Filter = "all" | "active" | "exceeded";

function formatNumber(value?: number) {
  return (value ?? 0).toLocaleString("id-ID");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pages(current: number, total: number) {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  return Array.from({ length: Math.min(5, total) }, (_, index) => start + index);
}

export function CustomerKeysClient({
  initialKeys,
  error,
}: {
  initialKeys: ResellerKey[];
  error: string | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const totals = useMemo(() => ({
    all: initialKeys.length,
    active: initialKeys.filter((key) => key.status === "active").length,
    exceeded: initialKeys.filter((key) => key.status === "exceeded").length,
  }), [initialKeys]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return initialKeys.filter((key) => {
      const matchesFilter = filter === "all" || key.status === filter;
      const matchesQuery = !term || key.name?.toLowerCase().includes(term) || String(key.id).toLowerCase().includes(term);
      return matchesFilter && matchesQuery;
    });
  }, [filter, initialKeys, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleKeys = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [query, filter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sun shadow-neo-sm">
              <KeyRound className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold">Customer Keys</h1>
              <p className="text-xs font-semibold text-base-ink/55">Pantau token dan status key pelanggan</p>
            </div>
          </div>
        </div>
        <span className="w-fit rounded-neo border-2 border-base-ink bg-accent-mint px-3 py-1.5 text-xs font-extrabold shadow-neo-sm">
          {formatNumber(totals.all)} total key
        </span>
      </div>

      {error ? (
        <Card className="bg-red-50">
          <CardContent className="flex items-center gap-3 p-5 text-sm font-bold text-red-700">
            <TriangleAlert className="h-5 w-5 shrink-0" />
            {error}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="flex h-11 items-center gap-2 rounded-neo border-2 border-base-ink bg-base-surface px-3 shadow-neo-sm focus-within:bg-white">
              <Search className="h-4 w-4 shrink-0 text-base-ink/50" strokeWidth={2.5} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau ID customer..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-base-ink/35"
              />
              {query && <span className="text-xs font-bold text-base-ink/45">{filtered.length} hasil</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["all", "active", "exceeded"] as Filter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={cn(
                    "rounded-neo border-2 border-base-ink px-3 py-2 text-xs font-extrabold capitalize transition-transform active:translate-y-0.5",
                    filter === item ? "bg-accent-sky shadow-neo-sm" : "bg-base-surface"
                  )}
                >
                  {item === "all" ? "Semua" : item} · {totals[item]}
                </button>
              ))}
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="border-b-2 border-base-ink bg-base-ink text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Pemakaian Token</th>
                      <th className="px-4 py-3">Request</th>
                      <th className="px-4 py-3">Masa Aktif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-base-ink/15">
                    {visibleKeys.map((key) => {
                      const used = key.usage?.total_tokens ?? 0;
                      const limit = key.maxTokens ?? 0;
                      const percentage = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                      const active = key.status === "active";
                      return (
                        <tr key={key.id} className="bg-base-surface transition-colors hover:bg-accent-sky/10">
                          <td className="px-4 py-3.5">
                            <p className="font-extrabold">{key.name || "Tanpa nama"}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-base-ink/45">ID #{key.id}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border-2 border-base-ink px-2.5 py-1 text-[11px] font-extrabold uppercase",
                              active ? "bg-accent-mint" : "bg-red-200"
                            )}>
                              {active ? <ShieldCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                              {key.status || "unknown"}
                            </span>
                          </td>
                          <td className="w-[300px] px-4 py-3.5">
                            <div className="flex justify-between gap-3 text-xs font-bold">
                              <span>{formatNumber(used)}</span>
                              <span className="text-base-ink/45">{formatNumber(limit)}</span>
                            </div>
                            <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-base-ink bg-base-bg">
                              <div className={cn("h-full", active ? "bg-accent-sky" : "bg-red-400")} style={{ width: `${percentage}%` }} />
                            </div>
                            <p className="mt-1 text-[10px] font-bold text-base-ink/45">{percentage}% terpakai</p>
                          </td>
                          <td className="px-4 py-3.5 text-sm font-extrabold">{formatNumber(key.usage?.requests)}</td>
                          <td className="px-4 py-3.5">
                            <p className="text-xs font-bold">{formatDate(key.expiresAt)}</p>
                            <p className="mt-1 text-[10px] text-base-ink/45">{key.validDays ?? "-"} hari</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {visibleKeys.length === 0 && (
                <div className="py-14 text-center">
                  <KeyRound className="mx-auto h-8 w-8 text-base-ink/25" />
                  <p className="mt-3 text-sm font-extrabold">Customer key tidak ditemukan</p>
                  <p className="text-xs text-base-ink/45">Ubah kata pencarian atau filter status.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {filtered.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-xs font-bold text-base-ink/50">
                Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-neo border-2 border-base-ink bg-base-surface p-2 disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pages(page, totalPages).map((number) => (
                  <button key={number} type="button" onClick={() => setPage(number)} className={cn("h-9 min-w-9 rounded-neo border-2 border-base-ink px-2 text-xs font-extrabold", page === number ? "bg-accent-sun shadow-neo-sm" : "bg-base-surface")}>
                    {number}
                  </button>
                ))}
                <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-neo border-2 border-base-ink bg-base-surface p-2 disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}