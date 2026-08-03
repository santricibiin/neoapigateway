"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Wallet, Users, ShoppingBag, PlusCircle, Copy, Check, Loader2, Eye, EyeOff, ExternalLink, KeyRound, ShieldCheck, Zap, CirclePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { QUOTA_PACKAGES } from "@/lib/bandelbanget";

type Reseller = { id: number; name: string; email: string; balance: number; active: boolean; createdAt: string };
type Member = {
  id: number;
  secretToken: string;
  apiKey: string | null;
  name: string | null;
  keyMasked: string | null;
  tokens: number;
  validDays: number;
  createdAt: string;
};
const QUOTA_PRESETS = Object.entries(QUOTA_PACKAGES).map(([code, pack]) => ({ code, ...pack }));

function formatTokens(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(0)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("id-ID");
}

export function ReswebDashboardClient({
  reseller,
  members,
  paidTopups,
}: {
  reseller: Reseller | null;
  members: Member[];
  paidTopups: number;
}) {
  const router = useRouter();
  const [addModal, setAddModal] = useState(false);
  const [quotaTarget, setQuotaTarget] = useState<Member | null>(null);
  const [packageCode, setPackageCode] = useState("1M");
  const [quotaPackageCode, setQuotaPackageCode] = useState("1M");
  const [creating, setCreating] = useState(false);
  const [addingQuota, setAddingQuota] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string | null; apiKey: string | null; keyMasked: string | null; dashboardUrl: string; pin: string } | null>(null);
  const [showKey, setShowKey] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const selectedPackage = QUOTA_PACKAGES[packageCode as keyof typeof QUOTA_PACKAGES];
  const selectedQuotaPackage = QUOTA_PACKAGES[quotaPackageCode as keyof typeof QUOTA_PACKAGES];

  async function handleAdd() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/res/api/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageCode }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Gagal membuat member");
      } else {
        setResult(data.member);
        setAddModal(false);
      }
    } catch {
      setError("Gagal terhubung ke server");
    }
    setCreating(false);
  }

  async function handleAddQuota() {
    if (!quotaTarget) return;
    setAddingQuota(true);
    setError(null);
    try {
      const response = await fetch("/res/api/add-member-quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: quotaTarget.id, packageCode: quotaPackageCode }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Tambah kuota gagal");
      setQuotaTarget(null);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tambah kuota gagal");
    } finally {
      setAddingQuota(false);
    }
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-accent-sky p-5 shadow-neo sm:p-7">
        <motion.svg animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} viewBox="0 0 120 120" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 text-white/30" aria-hidden><path d="M60 5 72 43 112 43 80 67 92 105 60 82 28 105 40 67 8 43 48 43Z" fill="currentColor" /></motion.svg>
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-base-ink bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"><Zap className="h-3 w-3" /> Reseller Center</span>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Kelola member, lebih cepat.</h1>
            <p className="mt-1 text-sm font-bold text-base-ink/60">{reseller?.email}</p>
          </div>
          <Button variant="primary" onClick={() => { setError(null); setAddModal(true); }}>
            <PlusCircle className="h-4 w-4" /> Buat Token Member
          </Button>
        </div>
      </motion.section>

      {error && <div className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Saldo Token" value={formatTokens(reseller?.balance ?? 0)} icon={<Wallet className="h-5 w-5" />} color="bg-accent-mint" />
        <Stat label="Total Member" value={members.length.toString()} icon={<Users className="h-5 w-5" />} color="bg-accent-sky" />
        <Stat label="Total Topup" value={paidTopups.toString()} icon={<ShoppingBag className="h-5 w-5" />} color="bg-accent-sun" />
      </div>

      {/* Members */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Token Member</h2>
        {members.length === 0 ? (
          <div className="rounded-neo border-2 border-dashed border-base-ink bg-white py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-base-ink/20" />
            <p className="mt-3 font-bold text-base-ink/50">Belum ada member</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-neo border-2 border-base-ink bg-white shadow-neo-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left">
                <thead className="bg-base-ink text-xs uppercase text-white">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3">API Key</th>
                    <th className="px-4 py-3">Dashboard</th>
                    <th className="px-4 py-3">Dibuat</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-base-ink/15">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-accent-sky/10">
                      <td className="px-4 py-3">
                        <p className="text-sm font-black">{m.name || "Tanpa nama"}</p>
                        <p className="font-mono text-[10px] text-base-ink/45">{formatTokens(m.tokens)} · {m.validDays}d</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] font-bold">
                        {showKey[m.id] ? m.secretToken : "••••••••"}
                        <button onClick={() => setShowKey((s) => ({ ...s, [m.id]: !s[m.id] }))} className="ml-2 text-base-ink/50 hover:text-base-ink">
                          {showKey[m.id] ? <EyeOff className="inline h-3 w-3" /> : <Eye className="inline h-3 w-3" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] font-bold">
                        {m.apiKey || m.keyMasked || "-"}
                        {(m.apiKey || m.keyMasked) && (
                          <button onClick={() => copy(`m${m.id}`, m.apiKey || m.keyMasked || "")} className="ml-2 text-base-ink/50 hover:text-base-ink">
                            {copied === `m${m.id}` ? <Check className="inline h-3 w-3" /> : <Copy className="inline h-3 w-3" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/quota/member/${m.secretToken}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-accent-sky underline">
                          Buka <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">{new Date(m.createdAt).toLocaleDateString("id-ID")}</td>
                      <td className="px-4 py-3"><Button type="button" size="sm" variant="mint" onClick={() => { setQuotaPackageCode("1M"); setError(null); setQuotaTarget(m); }}><CirclePlus className="h-4 w-4" /> Add Quota</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Add Member Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Buat Token Member" className="max-h-[92vh] overflow-y-auto">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold">Pilih paket token</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {QUOTA_PRESETS.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setPackageCode(p.code)}
                  className={cn(
                    "rounded-neo border-2 p-2 text-center text-xs font-black transition-colors",
                    packageCode === p.code ? "border-base-ink bg-accent-sky" : "border-base-ink bg-white hover:bg-accent-sky/30"
                  )}
                >
                  {p.code}
                  <span className="block text-[9px] font-normal text-base-ink/60">{p.validDays} hari</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-neo border-2 border-base-ink bg-base-bg p-3 text-xs font-bold">
            Saldo Anda: <span className="font-mono">{(reseller?.balance ?? 0).toLocaleString("id-ID")}</span> · Akan dipakai: <span className="font-mono">{selectedPackage.tokens.toLocaleString("id-ID")}</span> · Masa berlaku: {selectedPackage.validDays} hari
            {reseller && reseller.balance < selectedPackage.tokens && (
              <p className="mt-1 text-red-600">Saldo tidak cukup. Silakan topup dulu.</p>
            )}
          </div>
          <Button variant="primary" className="w-full" disabled={creating || !reseller || reseller.balance < selectedPackage.tokens} onClick={() => void handleAdd()}>
            {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Membuat...</> : <><PlusCircle className="h-4 w-4" /> Buat Member</>}
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(quotaTarget)} onClose={() => { if (!addingQuota) setQuotaTarget(null); }} title="Tambah Kuota Member" className="max-h-[92vh] overflow-y-auto">
        {quotaTarget ? <div className="space-y-4">
          <div className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-accent-sky p-4 shadow-neo-sm"><svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 text-white/35"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="12" /></svg><div className="relative"><p className="text-lg font-black">{quotaTarget.name || "Tanpa nama"}</p><p className="font-mono text-xs font-bold">Member #{quotaTarget.id}</p></div></div>
          <div><label className="text-sm font-bold">Pilih paket token</label><div className="mt-2 grid grid-cols-3 gap-2">{QUOTA_PRESETS.map((pack) => <button key={pack.code} type="button" onClick={() => setQuotaPackageCode(pack.code)} className={cn("rounded-neo border-2 border-base-ink p-2 text-xs font-black", quotaPackageCode === pack.code ? "bg-accent-mint shadow-neo-sm" : "bg-white")} >{pack.code}<span className="block text-[9px] font-normal text-base-ink/60">{pack.validDays} hari</span></button>)}</div></div>
          <div className="rounded-neo border-2 border-base-ink bg-base-bg p-3 text-xs font-bold">Saldo Anda: <span className="font-mono">{(reseller?.balance ?? 0).toLocaleString("id-ID")}</span> · Dipakai: <span className="font-mono">{selectedQuotaPackage.tokens.toLocaleString("id-ID")}</span> · Masa aktif: {selectedQuotaPackage.validDays} hari{reseller && reseller.balance < selectedQuotaPackage.tokens ? <p className="mt-1 text-red-600">Saldo tidak cukup. Silakan topup dulu.</p> : null}</div>
          <Button type="button" className="w-full" disabled={addingQuota || !reseller || reseller.balance < selectedQuotaPackage.tokens} onClick={() => void handleAddQuota()}>{addingQuota ? <Loader2 className="h-4 w-4 animate-spin" /> : <CirclePlus className="h-4 w-4" />}{addingQuota ? "Menambahkan..." : "Konfirmasi Add Quota"}</Button>
        </div> : null}
      </Modal>

      {/* Result Modal */}
      <Modal open={Boolean(result)} onClose={() => setResult(null)} title="Member Berhasil Dibuat">
        {result && (
          <div className="space-y-3">
            <div className="rounded-neo border-2 border-base-ink bg-accent-mint p-4 text-center">
              <KeyRound className="mx-auto h-8 w-8" />
              <p className="mt-1 font-extrabold">Token member siap</p>
            </div>
            {result.name && <p className="text-sm font-bold">Nama: {result.name}</p>}
            <div className="rounded-neo border-2 border-base-ink bg-base-bg p-3">
              <p className="mb-1 text-[10px] font-black uppercase text-base-ink/45">API Key</p>
              <p className="break-all font-mono text-xs font-bold">{result.apiKey || result.keyMasked || "-"}</p>
            </div>
            <div className="rounded-neo border-2 border-base-ink bg-base-bg p-3">
              <p className="mb-1 text-[10px] font-black uppercase text-base-ink/45">Dashboard Member</p>
              <p className="break-all font-mono text-xs font-bold">{result.dashboardUrl}</p>
            </div>
            <div className="rounded-neo border-2 border-base-ink bg-accent-sun p-3">
              <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-base-ink/55"><ShieldCheck className="h-3.5 w-3.5" /> PIN Dashboard</p>
              <div className="flex items-center justify-between gap-3"><p className="font-mono text-2xl font-black tracking-[0.25em]">{result.pin}</p><Button type="button" size="sm" variant="outline" onClick={() => copy("pin", result.pin)}>{copied === "pin" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied === "pin" ? "Tersalin" : "Salin"}</Button></div>
            </div>
            <a href={result.dashboardUrl} target="_blank" rel="noreferrer" className="block">
              <Button variant="sky" className="w-full">
                <ExternalLink className="h-4 w-4" /> Buka Dashboard Member
              </Button>
            </a>
            <Button variant="outline" className="w-full" onClick={() => setResult(null)}>Tutup</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} className={cn("rounded-neo border-2 border-base-ink p-4 shadow-neo-sm", color)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">{label}</p>
        {icon}
      </div>
      <p className="mt-1 text-xl font-black">{value}</p>
    </motion.div>
  );
}
