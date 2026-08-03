"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Boxes, Users, PackagePlus, Pencil, Trash2, Power, RefreshCw, Eye, EyeOff, ChevronLeft, ChevronRight, Wallet, Gauge, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { QUOTA_PACKAGES } from "@/lib/bandelbanget";
import {
  createResWebTier,
  updateResWebTier,
  deleteResWebTier,
  createResellerWeb,
  updateResellerWeb,
  toggleResellerWebActive,
  resetResellerWebPassword,
  adjustResellerWebBalance,
} from "@/app/actions/resweb-admin";

type Tier = {
  id: number;
  code: string;
  label: string;
  tokens: number;
  validDays: number;
  price: number;
  costPrice: number;
  active: boolean;
  sortOrder: number;
  orderCount: number;
};
type Reseller = {
  id: number;
  email: string;
  name: string;
  balance: number;
  active: boolean;
  memberCount: number;
  orderCount: number;
  createdAt: string;
};
type Member = {
  id: number;
  resellerId: number;
  resellerName: string;
  secretToken: string;
  apiKey: string | null;
  name: string | null;
  keyMasked: string | null;
  tokens: number;
  validDays: number;
  createdAt: string;
};

const QUOTA_OPTIONS = Object.entries(QUOTA_PACKAGES).map(([code, p]) => ({
  code,
  tokens: p.tokens,
  validDays: p.validDays,
}));

function formatTokens(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(0)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString("id-ID");
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function ReswebAdminClient({
  tiers: initialTiers,
  resellers: initialResellers,
  members: initialMembers,
  omzet,
  margin,
}: {
  tiers: Tier[];
  resellers: Reseller[];
  members: Member[];
  omzet: number;
  margin: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"tiers" | "resellers" | "members">("tiers");
  const [tierModal, setTierModal] = useState<{ open: boolean; editing: Tier | null }>({ open: false, editing: null });
  const [resellerModal, setResellerModal] = useState<{ open: boolean; editing: Reseller | null }>({ open: false, editing: null });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<number, boolean>>({});
  const [balanceTarget, setBalanceTarget] = useState<Reseller | null>(null);
  const [balanceDelta, setBalanceDelta] = useState("");
  const [resellerPage, setResellerPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const [memberReseller, setMemberReseller] = useState("all");
  const totalResellerBalance = useMemo(() => initialResellers.reduce((total, reseller) => total + reseller.balance, 0), [initialResellers]);
  const totalMemberBalance = useMemo(() => initialMembers.reduce((total, member) => total + member.tokens, 0), [initialMembers]);
  const resellerTotalPages = Math.max(1, Math.ceil(initialResellers.length / 10));
  const paginatedResellers = initialResellers.slice((resellerPage - 1) * 10, resellerPage * 10);
  const filteredMembers = useMemo(() => memberReseller === "all" ? initialMembers : initialMembers.filter((member) => member.resellerId === Number(memberReseller)), [initialMembers, memberReseller]);
  const memberTotalPages = Math.max(1, Math.ceil(filteredMembers.length / 10));
  const paginatedMembers = filteredMembers.slice((memberPage - 1) * 10, memberPage * 10);

  async function saveTier(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = tierModal.editing
      ? await updateResWebTier(tierModal.editing.id, formData)
      : await createResWebTier(formData);
    setSaving(false);
    if (!result.ok) return setError(result.error || "Gagal menyimpan paket");
    setTierModal({ open: false, editing: null });
    router.refresh();
  }

  async function saveReseller(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = resellerModal.editing
      ? await updateResellerWeb(resellerModal.editing.id, formData)
      : await createResellerWeb(formData);
    setSaving(false);
    if (!result.ok) return setError(result.error || "Gagal membuat reseller");
    setResellerModal({ open: false, editing: null });
    router.refresh();
  }

  async function removeTier(t: Tier) {
    if (!window.confirm(`Hapus paket ${t.code}?`)) return;
    const result = await deleteResWebTier(t.id);
    if (!result.ok) setError(result.error || "Gagal menghapus");
    router.refresh();
  }

  async function toggleActive(r: Reseller) {
    const result = await toggleResellerWebActive(r.id);
    if (!result.ok) setError(result.error || "Gagal mengubah status");
    router.refresh();
  }

  async function resetPassword(r: Reseller) {
    const pw = window.prompt(`Password baru untuk ${r.email} (min 6 karakter):`);
    if (!pw) return;
    const result = await resetResellerWebPassword(r.id, pw);
    if (!result.ok) setError(result.error || "Gagal reset password");
    else alert("Password direset");
  }

  async function adjustBalance() {
    if (!balanceTarget) return;
    const delta = Number(balanceDelta);
    if (!Number.isInteger(delta)) return setError("Delta harus angka bulat");
    setSaving(true);
    const result = await adjustResellerWebBalance(balanceTarget.id, delta);
    setSaving(false);
    if (!result.ok) setError(result.error || "Gagal ubah saldo");
    else {
      setBalanceTarget(null);
      setBalanceDelta("");
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-accent-lavender p-5 shadow-neo sm:p-7">
        <motion.svg animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 text-white/35"><path d="M50 5 61 38 95 39 68 58 77 91 50 72 23 91 32 58 5 39 39 38Z" fill="currentColor" /></motion.svg>
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><span className="inline-flex items-center gap-2 rounded-full border-2 border-base-ink bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest"><Sparkles className="h-3 w-3" /> ResWeb Control</span><h1 className="mt-3 text-3xl font-black sm:text-4xl">Kelola jaringan reseller.</h1><p className="mt-1 text-sm font-bold text-base-ink/60">Paket, saldo, reseller, dan member dalam satu panel.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="sky" onClick={() => setTierModal({ open: true, editing: null })}><PackagePlus className="h-4 w-4" /> Paket</Button>
            <Button variant="primary" onClick={() => setResellerModal({ open: true, editing: null })}><Users className="h-4 w-4" /> Reseller</Button>
          </div>
        </div>
      </motion.section>

      {error && <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Saldo Reseller" value={formatTokens(totalResellerBalance)} detail={`${initialResellers.length} akun reseller`} icon={<Wallet className="h-5 w-5" />} color="bg-accent-mint" />
        <SummaryCard label="Total Kuota Member" value={formatTokens(totalMemberBalance)} detail={`${initialMembers.length} token member`} icon={<Gauge className="h-5 w-5" />} color="bg-accent-sky" />
        <SummaryCard label="Omzet ResWeb" value={formatRupiah(omzet)} detail="Topup reseller lunas" icon={<Wallet className="h-5 w-5" />} color="bg-accent-sun" />
        <SummaryCard label="Margin ResWeb" value={formatRupiah(margin)} detail="Omzet dikurangi modal" icon={<Gauge className="h-5 w-5" />} color="bg-accent-lavender" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["tiers", "resellers", "members"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-neo border-2 border-base-ink px-4 py-2 text-sm font-extrabold capitalize transition-colors",
              tab === t ? "bg-base-ink text-white" : "bg-base-surface hover:bg-accent-sky/30"
            )}
          >
            {t === "tiers" ? `Paket (${initialTiers.length})` : t === "resellers" ? `Reseller (${initialResellers.length})` : `Member (${initialMembers.length})`}
          </button>
        ))}
      </div>

      {tab === "tiers" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {initialTiers.map((t, i) => (
            <motion.article
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-white p-5 shadow-neo-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={cn("inline-flex rounded-full border-2 border-base-ink px-2 py-0.5 text-[10px] font-black uppercase", t.active ? "bg-accent-mint" : "bg-base-bg")}>
                    {t.active ? "Aktif" : "Nonaktif"}
                  </span>
                  <p className="mt-2 font-mono text-[10px] font-bold text-base-ink/45">{t.code}</p>
                  <h2 className="text-xl font-black">{t.label}</h2>
                  <p className="text-sm font-bold text-base-ink/50">{formatTokens(t.tokens)} token · {t.validDays} hari</p>
                </div>
                  <div className="text-right"><span className="text-2xl font-black">{formatRupiah(t.price)}</span><p className="text-[10px] font-bold text-base-ink/45">Modal {formatRupiah(t.costPrice)}</p></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-neo border-2 border-base-ink bg-base-bg p-2">
                  <p className="text-[9px] font-black uppercase text-base-ink/40">Urutan</p>
                  <p className="text-xs font-black">{t.sortOrder}</p>
                </div>
                <div className="rounded-neo border-2 border-base-ink bg-base-bg p-2">
                  <p className="text-[9px] font-black uppercase text-base-ink/40">Terjual</p>
                  <p className="text-xs font-black">{t.orderCount}x</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t-2 border-base-ink/15 pt-4">
                <Button size="sm" variant="outline" onClick={() => setTierModal({ open: true, editing: t })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" className="bg-red-200 text-base-ink" onClick={() => removeTier(t)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.article>
          ))}
          {!initialTiers.length && (
            <div className="col-span-full rounded-neo border-2 border-dashed border-base-ink bg-white py-16 text-center">
              <Boxes className="mx-auto h-10 w-10 text-base-ink/20" />
              <p className="mt-3 font-black">Belum ada paket topup</p>
            </div>
          )}
        </div>
      )}

      {tab === "resellers" && (
        <div className="overflow-hidden rounded-neo border-2 border-base-ink bg-white shadow-neo-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-base-ink text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">Reseller</th>
                  <th className="px-4 py-3">Saldo</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-base-ink/15">
                {paginatedResellers.map((r) => (
                  <tr key={r.id} className="hover:bg-accent-sky/10">
                    <td className="px-4 py-3">
                      <p className="text-sm font-black">{r.name}</p>
                      <p className="font-mono text-[10px] text-base-ink/45">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-black">{formatTokens(r.balance)}</td>
                    <td className="px-4 py-3 text-sm font-bold">{r.memberCount}</td>
                    <td className="px-4 py-3 text-sm font-bold">{r.orderCount}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full border-2 border-base-ink px-2 py-0.5 text-[10px] font-black uppercase", r.active ? "bg-accent-mint" : "bg-red-200")}>
                        {r.active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" title="Edit reseller" onClick={() => { setError(null); setResellerModal({ open: true, editing: r }); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => toggleActive(r)}>
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="sky" onClick={() => { setError(null); setBalanceDelta(""); setBalanceTarget(r); }}>
                          Saldo
                        </Button>
                        <Button size="sm" variant="sun" onClick={() => resetPassword(r)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!paginatedResellers.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm font-bold text-base-ink/40">
                      Belum ada reseller
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={resellerPage} totalPages={resellerTotalPages} total={initialResellers.length} onPage={setResellerPage} label="reseller" />
        </div>
      )}

      {tab === "members" && (
        <div className="overflow-hidden rounded-neo border-2 border-base-ink bg-white shadow-neo-sm">
          <div className="flex flex-col gap-2 border-b-2 border-base-ink bg-accent-sky/20 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">Filter Member</p><p className="text-xs font-bold text-base-ink/45">{filteredMembers.length} member ditemukan</p></div><select value={memberReseller} onChange={(event) => { setMemberReseller(event.target.value); setMemberPage(1); }} className="h-10 rounded-neo border-2 border-base-ink bg-white px-3 text-sm font-bold shadow-neo-sm"><option value="all">Semua reseller</option>{initialResellers.map((reseller) => <option key={reseller.id} value={reseller.id}>{reseller.name} ({reseller.email})</option>)}</select></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-base-ink text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Reseller</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">API Key</th>
                  <th className="px-4 py-3">Dashboard</th>
                  <th className="px-4 py-3">Dibuat</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-base-ink/15">
                {paginatedMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-accent-sky/10">
                    <td className="px-4 py-3">
                      <p className="text-sm font-black">{m.name || "Tanpa nama"}</p>
                      <p className="font-mono text-[10px] text-base-ink/45">{formatTokens(m.tokens)} · {m.validDays}d</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold">{m.resellerName}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">
                      {showTokens[m.id] ? m.secretToken : "••••••••••••"}
                      <button onClick={() => setShowTokens((s) => ({ ...s, [m.id]: !s[m.id] }))} className="ml-2 text-base-ink/50 hover:text-base-ink">
                        {showTokens[m.id] ? <EyeOff className="inline h-3 w-3" /> : <Eye className="inline h-3 w-3" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">{m.apiKey || m.keyMasked || "-"}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`/quota/member/${m.secretToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-accent-sky underline"
                      >
                        Buka
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold">{new Date(m.createdAt).toLocaleDateString("id-ID")}</td>
                  </tr>
                ))}
                {!paginatedMembers.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm font-bold text-base-ink/40">
                      Belum ada member
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={memberPage} totalPages={memberTotalPages} total={filteredMembers.length} onPage={setMemberPage} label="member" />
        </div>
      )}

      {/* Modal Tier */}
      <Modal open={tierModal.open} onClose={() => setTierModal({ open: false, editing: null })} title={tierModal.editing ? "Edit Paket" : "Tambah Paket"} className="max-h-[92vh] overflow-y-auto">
        <form action={saveTier} className="space-y-4">
          <label className="block text-sm font-bold">
            Kode paket
            <select
              name="code"
              defaultValue={tierModal.editing?.code || ""}
              className="mt-1.5 h-11 w-full rounded-neo border-2 border-base-ink bg-white px-3 shadow-neo-sm"
              required
            >
              <option value="" disabled>Pilih paket...</option>
              {QUOTA_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.code} - {formatTokens(o.tokens)} ({o.validDays} hari)
                </option>
              ))}
            </select>
          </label>
          <Input name="label" label="Label tampilan" defaultValue={tierModal.editing?.label || ""} maxLength={50} required />
          <Input name="price" label="Harga (Rupiah)" type="number" min={0} step={1} defaultValue={tierModal.editing?.price ?? 0} required />
          <Input name="costPrice" label="Harga modal (internal)" type="number" min={0} step={1} defaultValue={tierModal.editing?.costPrice ?? 0} required />
          <Input name="sortOrder" label="Urutan (0=terbawah)" type="number" step={1} defaultValue={tierModal.editing?.sortOrder ?? 0} />
          <label className="flex items-center gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold">
            <input name="active" type="checkbox" defaultChecked={tierModal.editing?.active ?? true} className="h-5 w-5 accent-black" />
            Paket aktif
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTierModal({ open: false, editing: null })}>Batal</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(balanceTarget)} onClose={() => { if (!saving) setBalanceTarget(null); }} title="Atur Saldo Reseller">
        {balanceTarget ? <div className="space-y-4">
          <div className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-accent-mint p-4 shadow-neo-sm"><svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 text-white/35"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="12" /></svg><div className="relative"><p className="text-[10px] font-black uppercase tracking-widest text-base-ink/50">Saldo saat ini</p><p className="mt-1 text-3xl font-black">{formatTokens(balanceTarget.balance)}</p><p className="mt-1 text-xs font-bold text-base-ink/55">{balanceTarget.name} · {balanceTarget.email}</p></div></div>
          <Input label="Perubahan saldo" type="number" step={1} value={balanceDelta} onChange={(event) => setBalanceDelta(event.target.value)} placeholder="Contoh: 1000000 atau -1000000" />
          <p className="rounded-neo border-2 border-base-ink bg-base-bg p-3 text-xs font-bold">Gunakan angka positif untuk menambah, angka negatif untuk mengurangi. Saldo akhir: <span className={cn("font-mono text-sm font-black", balanceTarget.balance + Number(balanceDelta || 0) < 0 && "text-red-600")}>{formatTokens(balanceTarget.balance + Number(balanceDelta || 0))}</span></p>
          {balanceTarget.balance + Number(balanceDelta || 0) < 0 ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-xs font-bold">Saldo tidak boleh negatif.</p> : null}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setBalanceTarget(null)}>Batal</Button><Button type="button" disabled={saving || !balanceDelta || !Number.isInteger(Number(balanceDelta)) || balanceTarget.balance + Number(balanceDelta) < 0} onClick={() => void adjustBalance()}>{saving ? "Menyimpan..." : "Simpan Saldo"}</Button></div>
        </div> : null}
      </Modal>

      {/* Modal Reseller */}
      <Modal open={resellerModal.open} onClose={() => setResellerModal({ open: false, editing: null })} title={resellerModal.editing ? "Edit Reseller" : "Buat Reseller Baru"} className="max-h-[92vh] overflow-y-auto">
        <form action={saveReseller} className="space-y-4">
          <Input name="name" label="Nama reseller" defaultValue={resellerModal.editing?.name || ""} required maxLength={200} />
          <Input name="email" label="Email" type="email" defaultValue={resellerModal.editing?.email || ""} required />
          <Input name="password" label={resellerModal.editing ? "Password baru (opsional)" : "Password (min 6 karakter)"} type="password" required={!resellerModal.editing} minLength={6} />
          {resellerModal.editing ? <label className="flex items-center gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold"><input name="active" type="checkbox" defaultChecked={resellerModal.editing.active} className="h-5 w-5 accent-black" /> Akun aktif</label> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setResellerModal({ open: false, editing: null })}>Batal</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Menyimpan..." : resellerModal.editing ? "Simpan Perubahan" : "Buat"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SummaryCard({ label, value, detail, icon, color }: { label: string; value: string; detail: string; icon: React.ReactNode; color: string }) {
  return <motion.div whileHover={{ y: -4 }} className={cn("relative overflow-hidden rounded-neo border-2 border-base-ink p-5 shadow-neo-sm", color)}><svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -bottom-10 -right-8 h-28 w-28 text-white/30"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="12" /></svg><div className="relative flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-base-ink/50">{label}</p><p className="mt-1 text-3xl font-black">{value}</p><p className="mt-1 text-xs font-bold text-base-ink/50">{detail}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-neo border-2 border-base-ink bg-white shadow-neo-sm">{icon}</span></div></motion.div>;
}

function Pagination({ page, totalPages, total, onPage, label }: { page: number; totalPages: number; total: number; onPage: (page: number) => void; label: string }) {
  const start = total ? (page - 1) * 10 + 1 : 0;
  const end = Math.min(page * 10, total);
  return <div className="flex items-center justify-between gap-3 border-t-2 border-base-ink bg-base-bg px-4 py-3"><p className="text-xs font-bold text-base-ink/55">{start}-{end} dari {total} {label}</p><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Halaman sebelumnya"><ChevronLeft className="h-4 w-4" /></Button><span className="min-w-16 text-center text-xs font-black">{page} / {totalPages}</span><Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Halaman berikutnya"><ChevronRight className="h-4 w-4" /></Button></div></div>;
}
