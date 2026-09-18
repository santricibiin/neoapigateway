"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CirclePlus, Copy, Check, ExternalLink, KeyRound, Loader2, PlusCircle, Search, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { QUOTA_PACKAGES } from "@/lib/quota-packages";
import type { ResellerKey } from "@/lib/bandelbanget";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type Filter = "all" | "active" | "exceeded";

interface CreateKeyResult {
  ok: true;
  code: string;
  tokens: number;
  validDays: number;
  name: string | null;
  pin: string;
  apiKey: string | null;
  keyMasked: string | null;
  secretToken: string | null;
  dashboardUrl: string;
  apiBase: string;
  deliveryText: string;
}

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

function dashboardPath(key: ResellerKey) {
  if (key.secretToken) return `/quota/${encodeURIComponent(key.secretToken)}`;
  if (!key.dashboardUrl) return null;
  try {
    const token = new URL(key.dashboardUrl).pathname.split("/").filter(Boolean).pop();
    return token ? `/quota/${encodeURIComponent(token)}` : null;
  } catch {
    return null;
  }
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
  const [keys, setKeys] = useState(initialKeys);
  const [quotaTarget, setQuotaTarget] = useState<ResellerKey | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => setKeys(initialKeys), [initialKeys]);

  const totals = useMemo(() => ({
    all: keys.length,
    active: keys.filter((key) => key.status === "active").length,
    exceeded: keys.filter((key) => key.status === "exceeded").length,
  }), [keys]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return keys.filter((key) => {
      const matchesFilter = filter === "all" || key.status === filter;
      const matchesQuery = !term || key.name?.toLowerCase().includes(term) || String(key.id).toLowerCase().includes(term);
      return matchesFilter && matchesQuery;
    });
  }, [filter, keys, query]);

  async function refreshKeys() {
    setRefreshing(true);
    try {
      const response = await fetch("/dashboard/customer-keys/api", { cache: "no-store" });
      const body = await response.json();
      if (response.ok && body.ok) setKeys(body.keys as ResellerKey[]);
    } finally {
      setRefreshing(false);
    }
  }

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
            <span className="flex h-10 w-10 items-center justify-center rounded-neo border border-base-line bg-accent-sun shadow-neo-sm">
              <KeyRound className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold">Customer Keys</h1>
              <p className="text-xs font-semibold text-base-ink/55">Pantau token dan status key pelanggan</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden w-fit rounded-neo border border-base-line bg-accent-mint px-3 py-1.5 text-xs font-extrabold shadow-neo-sm sm:inline-block">
            {formatNumber(totals.all)} total key
          </span>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <PlusCircle className="h-4 w-4" /> Buat Key Baru
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="bg-red-50">
          <CardContent className="flex items-center gap-3 p-5 text-sm font-bold text-accent-terraDeep">
            <TriangleAlert className="h-5 w-5 shrink-0" />
            {error}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="flex h-11 items-center gap-2 rounded-neo border border-base-line bg-base-surface px-3 shadow-neo-sm focus-within:bg-base-surface">
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
                    "rounded-neo border border-base-line px-3 py-2 text-xs font-extrabold capitalize transition-transform active:translate-y-0.5",
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
                  <thead className="border-b border-base-line bg-base-ink text-base-bg text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Pemakaian Token</th>
                      <th className="px-4 py-3">Request</th>
                      <th className="px-4 py-3">Masa Aktif</th>
                      <th className="px-4 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-line">
                    {visibleKeys.map((key) => {
                      const used = key.usage?.total_tokens ?? 0;
                      const limit = key.maxTokens ?? 0;
                      const percentage = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                      const active = key.status === "active";
                      const dashboard = dashboardPath(key);
                      return (
                        <tr key={key.id} className="bg-base-surface transition-colors hover:bg-accent-sky/10">
                          <td className="px-4 py-3.5">
                            <p className="font-extrabold">{key.name || "Tanpa nama"}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-base-ink/45">ID #{key.id}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border border-base-line px-2.5 py-1 text-[11px] font-extrabold uppercase",
                              active ? "bg-accent-mint" : "bg-accent-terraSoft"
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
                              <div className={cn("h-full", active ? "bg-accent-sky" : "bg-[#C96A4A]")} style={{ width: `${percentage}%` }} />
                            </div>
                            <p className="mt-1 text-[10px] font-bold text-base-ink/45">{percentage}% terpakai</p>
                          </td>
                          <td className="px-4 py-3.5 text-sm font-extrabold">{formatNumber(key.usage?.requests)}</td>
                          <td className="px-4 py-3.5">
                            <p className="text-xs font-bold">{formatDate(key.expiresAt)}</p>
                            <p className="mt-1 text-[10px] text-base-ink/45">{key.validDays ?? "-"} hari</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex min-w-[190px] flex-col gap-2">
                              {dashboard ? (
                                <a href={dashboard} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-neo border border-base-line bg-accent-sun px-3 py-2 text-xs font-extrabold shadow-neo-sm transition-transform hover:-translate-y-0.5">
                                  Buka dashboard
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : null}
                              <button type="button" onClick={() => setQuotaTarget(key)} className="inline-flex items-center justify-center gap-1.5 rounded-neo border border-base-line bg-accent-mint px-3 py-2 text-xs font-extrabold shadow-neo-sm transition-transform hover:-translate-y-0.5">
                                <CirclePlus className="h-3.5 w-3.5" /> Add quota
                              </button>
                            </div>
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
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-neo border border-base-line bg-base-surface p-2 disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pages(page, totalPages).map((number) => (
                  <button key={number} type="button" onClick={() => setPage(number)} className={cn("h-9 min-w-9 rounded-neo border border-base-line px-2 text-xs font-extrabold", page === number ? "bg-accent-sun shadow-neo-sm" : "bg-base-surface")}>
                    {number}
                  </button>
                ))}
                <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-neo border border-base-line bg-base-surface p-2 disabled:cursor-not-allowed disabled:opacity-35">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <AddQuotaModal target={quotaTarget} onClose={() => setQuotaTarget(null)} onSuccess={refreshKeys} refreshing={refreshing} />
      <CreateKeyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={async () => {
          await refreshKeys();
        }}
      />
    </div>
  );
}

function CreateKeyModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: CreateKeyResult) => Promise<void>;
}) {
  const packageCodes = Object.keys(QUOTA_PACKAGES) as Array<keyof typeof QUOTA_PACKAGES>;
  const [packageCode, setPackageCode] = useState<keyof typeof QUOTA_PACKAGES>("5M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateKeyResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);
      setPackageCode("5M");
    }
  }, [open]);

  async function create() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/dashboard/customer-keys/api/create-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageCode }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Gagal membuat key");
      setResult(body as CreateKeyResult);
      await onSuccess(body as CreateKeyResult);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gagal membuat key");
    } finally {
      setLoading(false);
    }
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  const selected = QUOTA_PACKAGES[packageCode];

  return (
    <Modal open={open} onClose={onClose} title={result ? "Key Berhasil Dibuat" : "Buat Key Baru"} className="max-h-[92vh] overflow-y-auto">
      {result ? (
        <div className="space-y-3">
          <div className="rounded-neo border border-base-line bg-accent-mint p-4 text-center">
            <KeyRound className="mx-auto h-8 w-8" />
            <p className="mt-1 font-extrabold">Paket {result.code} · {formatNumber(result.tokens)} token · {result.validDays} hari</p>
          </div>
          <div className="rounded-neo border border-base-line bg-base-bg p-3">
            <p className="mb-1 text-[10px] font-black uppercase text-base-ink/45">API Key</p>
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 break-all font-mono text-xs font-bold">{result.apiKey || result.keyMasked || "-"}</p>
              {result.apiKey ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void copy("key", result.apiKey!)}>
                  {copied === "key" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="rounded-neo border border-base-line bg-accent-sun p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase text-base-ink/55">PIN Dashboard</p>
                <p className="font-mono text-2xl font-black tracking-[0.25em]">{result.pin}</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => void copy("pin", result.pin)}>
                {copied === "pin" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="rounded-neo border border-base-line bg-base-bg p-3">
            <p className="mb-1 text-[10px] font-black uppercase text-base-ink/45">Dashboard Member</p>
            <p className="break-all font-mono text-xs font-bold">{result.dashboardUrl}</p>
          </div>
          <div className="rounded-neo border border-base-line bg-[#1C1917] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase text-white/45">Detail Lengkap (siap kirim)</p>
              <Button type="button" size="sm" variant="sun" onClick={() => void copy("delivery", result.deliveryText)}>
                {copied === "delivery" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "delivery" ? "Tersalin" : "Salin"}
              </Button>
            </div>
            <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-[#A8C69A]">{result.deliveryText}</pre>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href={result.dashboardUrl} target="_blank" rel="noreferrer" className="flex-1">
              <Button variant="sky" className="w-full">
                <ExternalLink className="h-4 w-4" /> Buka Dashboard
              </Button>
            </a>
            <Button variant="outline" className="flex-1" onClick={onClose}>Tutup</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="rounded-neo border border-base-line bg-accent-sunSoft p-3 text-xs font-bold">
            Key baru dibuat dari kuota reseller provider. Pilih paket sesuai kebutuhan customer.
          </p>
          <div>
            <label className="text-sm font-bold">Pilih paket token</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {packageCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPackageCode(code)}
                  className={cn(
                    "rounded-neo border border-base-line px-2 py-3 text-sm font-black transition-colors",
                    packageCode === code ? "bg-accent-mint shadow-neo-sm" : "bg-base-bg hover:bg-accent-sky/20"
                  )}
                >
                  {code}
                  <span className="mt-0.5 block text-[9px] font-bold text-base-ink/50">{QUOTA_PACKAGES[code].validDays} hari</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-neo border border-base-line bg-base-bg p-3 text-sm font-bold">
            <p>Token: <span className="font-black">{formatNumber(selected.tokens)}</span></p>
            <p>Masa aktif: <span className="font-black">{selected.validDays} hari</span></p>
          </div>
          {error ? <p className="rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold">{error}</p> : null}
          <Button type="button" className="w-full" disabled={loading} onClick={() => void create()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            {loading ? "Membuat key..." : "Buat Key Sekarang"}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function AddQuotaModal({ target, onClose, onSuccess, refreshing }: { target: ResellerKey | null; onClose: () => void; onSuccess: () => Promise<void>; refreshing: boolean }) {
  const packageCodes = Object.keys(QUOTA_PACKAGES) as Array<keyof typeof QUOTA_PACKAGES>;
  const [mode, setMode] = useState<"package" | "custom">("package");
  const [packageCode, setPackageCode] = useState<keyof typeof QUOTA_PACKAGES>("5M");
  const [tokens, setTokens] = useState("5000000");
  const [days, setDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setMode("package");
    setPackageCode("5M");
    setTokens("5000000");
    setDays("7");
    setMessage(null);
    setError(null);
  }, [target]);

  async function submit() {
    if (!target || loading) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/dashboard/customer-keys/api/add-quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetKeyId: target.id,
          targetName: target.name || "Tanpa nama",
          packageCode: mode === "package" ? packageCode : undefined,
          addTokens: mode === "custom" ? Number(tokens) : undefined,
          validDays: mode === "custom" ? Number(days) : undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Tambah kuota gagal");
      const remaining = body.remainingQuota == null ? "" : ` · Sisa reseller ${formatNumber(Number(body.remainingQuota))}`;
      setMessage(`Berhasil +${formatNumber(Number(body.addTokens))} token · ${body.validDays} hari${remaining}`);
      await onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tambah kuota gagal");
    } finally {
      setLoading(false);
    }
  }

  const selected = QUOTA_PACKAGES[packageCode];

  return (
    <Modal open={Boolean(target)} onClose={onClose} title="Tambah Kuota Customer" className="max-h-[92vh] overflow-y-auto">
      {target ? (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-neo border border-base-line bg-accent-sky p-4 shadow-neo-sm">
            <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 text-white/35"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="12" /></svg>
            <div className="relative flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-neo border border-base-line bg-base-surface"><UserRound className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-lg font-black">{target.name || "Tanpa nama"}</p><p className="font-mono text-xs font-bold">Customer ID #{target.id}</p></div></div>
          </div>
          <p className="rounded-neo border border-base-line bg-accent-sunSoft p-3 text-xs font-bold">Kuota yang ditambahkan akan memotong saldo quota reseller. Pastikan ID dan nama customer benar.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode("package")} className={cn("rounded-neo border border-base-line px-3 py-2 text-sm font-extrabold", mode === "package" ? "bg-accent-lavender shadow-neo-sm" : "bg-base-surface")}>Paket</button>
            <button type="button" onClick={() => setMode("custom")} className={cn("rounded-neo border border-base-line px-3 py-2 text-sm font-extrabold", mode === "custom" ? "bg-accent-lavender shadow-neo-sm" : "bg-base-surface")}>Custom</button>
          </div>
          {mode === "package" ? (
            <div className="grid grid-cols-3 gap-2">
              {packageCodes.map((code) => <button key={code} type="button" onClick={() => setPackageCode(code)} className={cn("rounded-neo border border-base-line px-2 py-3 text-sm font-black", packageCode === code ? "bg-accent-mint shadow-neo-sm" : "bg-base-bg")}>{code}<span className="mt-0.5 block text-[9px] font-bold text-base-ink/50">{QUOTA_PACKAGES[code].validDays} hari</span></button>)}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2"><Input label="Jumlah token" type="number" min={1} max={10000000000} step={1} value={tokens} onChange={(event) => setTokens(event.target.value)} /><Input label="Masa aktif (hari)" type="number" min={1} max={365} step={1} value={days} onChange={(event) => setDays(event.target.value)} /></div>
          )}
          <div className="rounded-neo border border-base-line bg-base-bg p-3 text-sm font-bold"><p>Tambah: <span className="font-black">{formatNumber(mode === "package" ? selected.tokens : Number(tokens))} token</span></p><p>Masa aktif: <span className="font-black">{mode === "package" ? selected.validDays : Number(days)} hari</span></p></div>
          {message ? <p className="rounded-neo border border-base-line bg-accent-mint p-3 text-sm font-bold">{message}{refreshing ? " · Memuat data..." : ""}</p> : null}
          {error ? <p className="rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold">{error}</p> : null}
          <Button type="button" className="w-full" disabled={loading || refreshing} onClick={() => void submit()}><CirclePlus className="h-4 w-4" />{loading ? "Menambahkan..." : message ? "Tambah Lagi" : "Konfirmasi Tambah Kuota"}</Button>
        </div>
      ) : null}
    </Modal>
  );
}
