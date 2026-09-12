"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Eye, EyeOff, Network, Power, RefreshCw, Search, Server } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  setBlockedModels,
  setEnabledProviders,
  setModelAllowed,
  setProviderEnabled,
  setRouterEnabled,
  type RouterProviderRow,
  type UpstreamModelRow,
  type UpstreamPageData,
} from "@/app/actions/upstream";

type Tab = "bandel" | "router";

const badge = "rounded-full border border-base-line px-2 py-0.5 text-[10px] font-extrabold uppercase";

function Stat({ label, value, bg }: { label: string; value: number | string; bg: string }) {
  return (
    <div className={`rounded-neo border border-base-line p-4 shadow-neo-sm ${bg}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-base-ink/50">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function UpstreamAdminClient({ data }: { data: UpstreamPageData }) {
  const nav = useRouter();
  const [tab, setTab] = useState<Tab>("bandel");
  const [bandel, setBandel] = useState(data.bandel);
  const [providers, setProviders] = useState(data.router);
  const [routerOn, setRouterOn] = useState(data.routerEnabled);
  const [openProvider, setOpenProvider] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const detail = providers.find((p) => p.provider === openProvider) || null;

  const filteredBandel = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? bandel.filter((m) => m.id.toLowerCase().includes(q)) : bandel;
  }, [bandel, query]);

  const filteredProviders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => p.provider.toLowerCase().includes(q) || p.models.some((m) => m.id.toLowerCase().includes(q)));
  }, [providers, query]);

  const bandelAllowed = bandel.filter((m) => m.allowed).length;
  const routerModelCount = providers.reduce((sum, p) => sum + p.total, 0);
  const routerActiveModels = providers
    .filter((p) => p.enabled)
    .reduce((sum, p) => sum + p.allowed, 0);

  function fail(message: string | undefined, rollback: () => void) {
    rollback();
    setError(message || "Gagal menyimpan perubahan");
  }

  async function toggleMaster() {
    const next = !routerOn;
    setError(null);
    setRouterOn(next);
    const result = await setRouterEnabled(next);
    if (!result.ok) fail(result.error, () => setRouterOn(!next));
  }

  async function toggleBandelModel(model: UpstreamModelRow) {
    const next = !model.allowed;
    setBusy(model.id);
    setError(null);
    setBandel((prev) => prev.map((m) => (m.id === model.id ? { ...m, allowed: next } : m)));
    const result = await setModelAllowed(model.id, next);
    setBusy(null);
    if (!result.ok) {
      fail(result.error, () =>
        setBandel((prev) => prev.map((m) => (m.id === model.id ? { ...m, allowed: model.allowed } : m)))
      );
    }
  }

  async function bulkBandel(allowAll: boolean) {
    const scope = filteredBandel;
    if (!scope.length) return;
    if (!window.confirm(`${scope.length} model akan di${allowAll ? "aktifkan" : "matikan"}. Lanjut?`)) return;
    const snapshot = bandel;
    const ids = new Set(scope.map((m) => m.id));
    const next = bandel.map((m) => (ids.has(m.id) ? { ...m, allowed: allowAll } : m));
    setError(null);
    setBandel(next);
    const result = await setBlockedModels(next.filter((m) => !m.allowed).map((m) => m.id));
    if (!result.ok) fail(result.error, () => setBandel(snapshot));
  }

  async function toggleProvider(row: RouterProviderRow) {
    const next = !row.enabled;
    setBusy(row.provider);
    setError(null);
    setProviders((prev) => prev.map((p) => (p.provider === row.provider ? { ...p, enabled: next } : p)));
    const result = await setProviderEnabled(row.provider, next);
    setBusy(null);
    if (!result.ok) {
      fail(result.error, () =>
        setProviders((prev) => prev.map((p) => (p.provider === row.provider ? { ...p, enabled: row.enabled } : p)))
      );
    }
  }

  async function bulkProviders(enableAll: boolean) {
    const scope = filteredProviders;
    if (!scope.length) return;
    if (!window.confirm(`${scope.length} provider akan di${enableAll ? "aktifkan" : "matikan"}. Lanjut?`)) return;
    const snapshot = providers;
    const names = new Set(scope.map((p) => p.provider));
    const next = providers.map((p) => (names.has(p.provider) ? { ...p, enabled: enableAll } : p));
    setError(null);
    setProviders(next);
    const result = await setEnabledProviders(next.filter((p) => p.enabled).map((p) => p.provider));
    if (!result.ok) fail(result.error, () => setProviders(snapshot));
  }

  async function toggleRouterModel(provider: string, id: string, currentAllowed: boolean) {
    const next = !currentAllowed;
    setBusy(id);
    setError(null);
    const patch = (allowed: boolean) =>
      setProviders((prev) =>
        prev.map((p) =>
          p.provider !== provider
            ? p
            : {
                ...p,
                models: p.models.map((m) => (m.id === id ? { ...m, allowed } : m)),
                allowed: p.models.filter((m) => (m.id === id ? allowed : m.allowed)).length,
              }
        )
      );
    patch(next);
    const result = await setModelAllowed(id, next);
    setBusy(null);
    if (!result.ok) fail(result.error, () => patch(currentAllowed));
  }

  async function bulkRouterModels(row: RouterProviderRow, allowAll: boolean) {
    if (!window.confirm(`${row.total} model ${row.provider} akan di${allowAll ? "aktifkan" : "matikan"}. Lanjut?`)) return;
    const snapshot = providers;
    const ids = new Set(row.models.map((m) => m.id));
    const next = providers.map((p) =>
      p.provider !== row.provider
        ? p
        : { ...p, models: p.models.map((m) => ({ ...m, allowed: allowAll })), allowed: allowAll ? p.total : 0 }
    );
    setError(null);
    setProviders(next);
    // Blocklist global: gabung state model bandel + semua provider router.
    const blocked = [
      ...bandel.filter((m) => !m.allowed).map((m) => m.id),
      ...next.flatMap((p) => p.models.filter((m) => !m.allowed).map((m) => m.id)),
    ];
    const result = await setBlockedModels(allowAll ? blocked.filter((id) => !ids.has(id)) : blocked);
    if (!result.ok) fail(result.error, () => setProviders(snapshot));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-neo border border-base-line bg-accent-sky shadow-neo-sm">
            <Server className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-black">Upstream</h1>
            <p className="text-sm font-semibold text-base-ink/55">
              Model yang dimatikan hilang dari <code className="font-mono">/v1/models</code> dan ditolak 404 saat dipakai
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" disabled={pending} onClick={() => startTransition(() => nav.refresh())}>
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} /> Muat Ulang
        </Button>
      </div>

      <div className="flex gap-2">
        {(
          [
            { key: "bandel" as Tab, label: "bandelbanget", count: bandel.length },
            { key: "router" as Tab, label: "9router", count: routerModelCount },
          ]
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              setQuery("");
            }}
            className={`rounded-neo border border-base-line px-4 py-2 text-sm font-black shadow-neo-sm transition-colors ${tab === item.key ? "bg-base-ink text-white" : "bg-white"}`}
          >
            {item.label} <span className="opacity-60">({item.count})</span>
          </button>
        ))}
      </div>

      {error ? <Alert>{error}</Alert> : null}

      {tab === "bandel" ? (
        <>
          {data.bandelError ? <Alert>{data.bandelError}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Aktif" value={bandelAllowed} bg="bg-accent-mint" />
            <Stat label="Dimatikan" value={bandel.length - bandelAllowed} bg="bg-accent-sun" />
            <Stat label="Total" value={bandel.length} bg="bg-white" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-[2.4rem] h-4 w-4 text-base-ink/40" />
              <Input label="Cari model" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="claude, gpt..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="mint" onClick={() => void bulkBandel(true)}>
                Aktifkan {query ? "hasil" : "semua"}
              </Button>
              <Button type="button" size="sm" variant="sun" onClick={() => void bulkBandel(false)}>
                Matikan {query ? "hasil" : "semua"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {filteredBandel.map((model) => (
              <div
                key={model.id}
                className={`flex items-center justify-between gap-3 rounded-neo border border-base-line p-4 shadow-neo-sm ${model.allowed ? "bg-white" : "bg-base-bg"}`}
              >
                <div className="min-w-0">
                  <p className={`truncate font-mono text-sm font-bold ${model.allowed ? "" : "line-through opacity-55"}`}>{model.id}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={badge}>Grade {model.grade}</span>
                    {model.vision ? <span className={`${badge} bg-accent-lavender`}>Vision</span> : null}
                    {!model.upstreamEnabled ? <span className={`${badge} bg-accent-terraSoft`}>Off di upstream</span> : null}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={model.allowed ? "sun" : "mint"}
                  aria-pressed={model.allowed}
                  aria-label={`${model.allowed ? "Matikan" : "Aktifkan"} model ${model.id}`}
                  disabled={busy === model.id}
                  onClick={() => void toggleBandelModel(model)}
                  className="shrink-0"
                >
                  {model.allowed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {model.allowed ? "Matikan" : "Aktifkan"}
                </Button>
              </div>
            ))}
          </div>

          {!filteredBandel.length ? (
            <div className="rounded-neo border border-dashed border-base-line bg-white py-16 text-center">
              <Server className="mx-auto h-10 w-10 text-base-ink/25" />
              <p className="mt-3 font-black">{bandel.length ? "Tidak ada model cocok" : "Model tidak termuat"}</p>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {data.routerError ? <Alert>{data.routerError}</Alert> : null}
          {!data.routerConfigured ? (
            <Alert>
              <code className="font-mono">ROUTER_KEY</code> belum diisi di <code className="font-mono">.env</code>. Router tidak bisa dinyalakan.
            </Alert>
          ) : null}

          <div
            className={`flex flex-col justify-between gap-3 rounded-neo border border-base-line p-4 shadow-neo-sm sm:flex-row sm:items-center ${routerOn ? "bg-accent-mint" : "bg-base-bg"}`}
          >
            <div className="flex items-center gap-3">
              <Network className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">Upstream 9router {routerOn ? "aktif" : "nonaktif"}</p>
                <p className="text-xs font-semibold text-base-ink/60">
                  Saat nonaktif, tidak ada model 9router yang muncul atau bisa dipakai, apa pun status provider
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant={routerOn ? "sun" : "mint"}
              aria-pressed={routerOn}
              disabled={!data.routerConfigured}
              onClick={() => void toggleMaster()}
              className="shrink-0"
            >
              <Power className="h-4 w-4" /> {routerOn ? "Matikan" : "Aktifkan"}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Provider aktif" value={providers.filter((p) => p.enabled).length} bg="bg-accent-mint" />
            <Stat label="Total provider" value={providers.length} bg="bg-white" />
            <Stat label="Model tersaji" value={routerOn ? routerActiveModels : 0} bg="bg-accent-sky" />
            <Stat label="Total model" value={routerModelCount} bg="bg-white" />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-[2.4rem] h-4 w-4 text-base-ink/40" />
              <Input label="Cari provider / model" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="cf, kr, claude..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="mint" onClick={() => void bulkProviders(true)}>
                Aktifkan {query ? "hasil" : "semua"}
              </Button>
              <Button type="button" size="sm" variant="sun" onClick={() => void bulkProviders(false)}>
                Matikan {query ? "hasil" : "semua"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredProviders.map((row, index) => (
              <motion.div
                key={row.provider}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.25) }}
                className={`rounded-neo border border-base-line p-4 shadow-neo-sm ${row.enabled ? "bg-white" : "bg-base-bg"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-black">{row.provider}</p>
                    <p className="mt-1 text-xs font-bold text-base-ink/55">
                      {row.allowed}/{row.total} model aktif
                    </p>
                  </div>
                  <span className={`${badge} shrink-0 ${row.enabled ? "bg-accent-mint" : ""}`}>{row.enabled ? "On" : "Off"}</span>
                </div>
                <div className="mt-4 flex gap-2 border-t border-base-line pt-3">
                  <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setOpenProvider(row.provider)}>
                    Lihat model
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={row.enabled ? "sun" : "mint"}
                    aria-pressed={row.enabled}
                    aria-label={`${row.enabled ? "Matikan" : "Aktifkan"} provider ${row.provider}`}
                    disabled={busy === row.provider}
                    onClick={() => void toggleProvider(row)}
                  >
                    {row.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {!filteredProviders.length ? (
            <div className="rounded-neo border border-dashed border-base-line bg-white py-16 text-center">
              <Network className="mx-auto h-10 w-10 text-base-ink/25" />
              <p className="mt-3 font-black">{providers.length ? "Tidak ada provider cocok" : "Provider tidak termuat"}</p>
              <p className="text-sm font-semibold text-base-ink/45">
                {providers.length ? "Ubah kata kunci." : "Pastikan 9router jalan di ROUTER_UPSTREAM lalu muat ulang."}
              </p>
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={Boolean(detail)}
        onClose={() => setOpenProvider(null)}
        title={detail ? `Model ${detail.provider}` : ""}
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
      >
        {detail ? (
          <div className="space-y-3">
            {!detail.enabled ? (
              <p className="rounded-neo border border-base-line bg-accent-sun p-3 text-sm font-bold">
                Provider ini nonaktif. Model di bawah tidak tersaji sampai provider diaktifkan.
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="mint" onClick={() => void bulkRouterModels(detail, true)}>
                Aktifkan semua
              </Button>
              <Button type="button" size="sm" variant="sun" onClick={() => void bulkRouterModels(detail, false)}>
                Matikan semua
              </Button>
            </div>
            <ul className="space-y-2">
              {detail.models.map((model) => (
                <li
                  key={model.id}
                  className={`flex items-center justify-between gap-3 rounded-neo border border-base-line p-3 ${model.allowed ? "bg-white" : "bg-base-bg"}`}
                >
                  <div className="min-w-0">
                    <p className={`truncate font-mono text-xs font-bold ${model.allowed ? "" : "line-through opacity-55"}`}>
                      {model.label}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {model.vision ? <span className={`${badge} bg-accent-lavender`}>Vision</span> : null}
                      {model.reasoning ? <span className={`${badge} bg-accent-sky`}>Reasoning</span> : null}
                      {model.contextWindow ? <span className={badge}>{Math.round(model.contextWindow / 1000)}K ctx</span> : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={model.allowed ? "sun" : "mint"}
                    aria-pressed={model.allowed}
                    aria-label={`${model.allowed ? "Matikan" : "Aktifkan"} model ${model.id}`}
                    disabled={busy === model.id}
                    onClick={() => void toggleRouterModel(detail.provider, model.id, model.allowed)}
                    className="shrink-0"
                  >
                    {model.allowed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
