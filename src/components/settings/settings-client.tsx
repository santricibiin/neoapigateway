"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  Lock,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  Database,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSettings } from "@/app/actions/settings";
import { copyText } from "@/lib/copy";

function generateSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function SettingsClient({
  initialSecretKey,
  initialPin,
  initialQrisProvider,
  initialQrisStatic,
  initialQrisTtlMinutes,
  initialForwarderSecret,
  initialUniqueCodeEnabled,
  initialBackupEnabled,
  initialBackupInterval,
  initialBackupUnit,
  initialTelegramBotToken,
  initialTelegramChatId,
  initialSiteName,
  hasLogo,
}: {
  initialSecretKey: string;
  initialPin: string;
  initialQrisProvider: string;
  initialQrisStatic: string;
  initialQrisTtlMinutes: number;
  initialForwarderSecret: string;
  initialUniqueCodeEnabled: boolean;
  initialBackupEnabled: boolean;
  initialBackupInterval: number;
  initialBackupUnit: string;
  initialTelegramBotToken: string;
  initialTelegramChatId: string;
  initialSiteName: string;
  hasLogo: boolean;
}) {
  const [showKey, setShowKey] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showForwarder, setShowForwarder] = useState(false);
  const [forwarderSecret, setForwarderSecret] = useState(initialForwarderSecret || generateSecret());
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(hasLogo ? "/api/brand/logo" : null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setSuccess(false);
    setError(null);
    const res = await saveSettings(formData);
    setSaving(false);
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(res.error ?? "Terjadi kesalahan");
    }
  }

  async function handleCopy() {
    if (!forwarderSecret) return;
    if (await copyText(forwarderSecret)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/brand/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setLogoUrl(`/api/brand/logo?t=${Date.now()}`);
      } else {
        setError(data.error || "Gagal upload logo");
      }
    } catch {
      setError("Gagal upload logo");
    }
    setLogoUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleLogoDelete() {
    if (!window.confirm("Hapus logo?")) return;
    setLogoUploading(true);
    try {
      await fetch("/api/brand/upload", { method: "DELETE" });
      setLogoUrl(null);
    } catch {}
    setLogoUploading(false);
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 sm:mb-7">
        <span className="mb-2 inline-flex items-center gap-2 rounded-full border-2 border-base-ink bg-accent-mint px-3 py-1 text-xs font-black uppercase tracking-wider">
          <ShieldCheck className="h-3.5 w-3.5" />
          Konfigurasi Aman
        </span>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Pengaturan Sistem</h1>
        <p className="mt-1 max-w-2xl text-sm text-base-ink/60 sm:text-base">
          Kelola branding, koneksi reseller, pembayaran QRIS, backup, dan notifikasi.
        </p>
      </div>

      <form action={handleSubmit} className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)]">
        <div className="space-y-4 sm:space-y-6">
          {/* Branding */}
          <section className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b-2 border-base-ink bg-accent-mint px-4 py-3 sm:px-5">
              <ImageIcon className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Branding Website</h2>
                <p className="text-xs text-base-ink/65">Nama & logo tampil di semua halaman</p>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <Input name="siteName" label="Nama Website" defaultValue={initialSiteName} placeholder="Neo API Gateway" maxLength={100} />
              <div>
                <label className="mb-1.5 block text-sm font-bold">Logo Website</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-neo border-2 border-base-ink bg-base-bg">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-base-ink/30" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                    <Button type="button" size="sm" variant="sky" disabled={logoUploading} onClick={() => fileRef.current?.click()}>
                      <Upload className="h-4 w-4" /> {logoUploading ? "Uploading..." : "Upload Logo"}
                    </Button>
                    {logoUrl && (
                      <Button type="button" size="sm" variant="outline" disabled={logoUploading} onClick={handleLogoDelete}>
                        <Trash2 className="h-4 w-4" /> Hapus
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-base-ink/50">PNG/JPG/GIF/WebP/SVG, maksimal 5MB. Disimpan di luar folder public.</p>
              </div>
            </div>
          </section>

          {/* Reseller */}
          <section className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b-2 border-base-ink bg-accent-lavender px-4 py-3 sm:px-5">
              <KeyRound className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Koneksi Reseller</h2>
                <p className="text-xs text-base-ink/65">Kredensial API BandelBanget</p>
              </div>
            </div>
            <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
              <div>
                <label htmlFor="secretKey" className="mb-1.5 block text-sm font-bold">Secret Key</label>
                <div className="relative">
                  <Input id="secretKey" name="secretKey" type={showKey ? "text" : "password"} defaultValue={initialSecretKey} placeholder="Masukkan Secret Key" autoComplete="off" className="min-w-0 pr-11 font-mono text-sm" />
                  <button type="button" onClick={() => setShowKey((v) => !v)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-base-ink/55 hover:bg-base-bg hover:text-base-ink" aria-label={showKey ? "Sembunyikan" : "Tampilkan"}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="pin" className="mb-1.5 block text-sm font-bold">PIN</label>
                <div className="relative">
                  <Input id="pin" name="pin" type={showPin ? "text" : "password"} inputMode="numeric" defaultValue={initialPin} placeholder="6 digit PIN" autoComplete="off" className="pr-11 font-mono" />
                  <button type="button" onClick={() => setShowPin((v) => !v)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-base-ink/55 hover:bg-base-bg hover:text-base-ink" aria-label={showPin ? "Sembunyikan" : "Tampilkan"}>
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* QRIS */}
          <section className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b-2 border-base-ink bg-accent-sun px-4 py-3 sm:px-5">
              <QrCode className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Pembayaran QRIS</h2>
                <p className="text-xs text-base-ink/65">Provider, payload, masa aktif invoice</p>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div>
                  <label htmlFor="qrisProvider" className="mb-1.5 block text-sm font-bold">Provider</label>
                  <select id="qrisProvider" name="qrisProvider" defaultValue={initialQrisProvider} className="w-full rounded-neo border-2 border-base-ink bg-base-surface px-4 py-2.5 text-base shadow-neo-sm outline-none focus:shadow-neo">
                    <option value="none">Nonaktif</option>
                    <option value="dana">DANA</option>
                    <option value="nobu">Nobu/Neobank</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="qrisTtlMinutes" className="mb-1.5 flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4" /> Berlaku (menit)</label>
                  <Input id="qrisTtlMinutes" name="qrisTtlMinutes" type="number" min={1} max={120} defaultValue={initialQrisTtlMinutes} />
                </div>
              </div>
              <div>
                <label htmlFor="qrisStatic" className="mb-1.5 block text-sm font-bold">QRIS Statis</label>
                <textarea id="qrisStatic" name="qrisStatic" defaultValue={initialQrisStatic} placeholder="00020101021126...6304ABCD" rows={5} className="w-full resize-y rounded-neo border-2 border-base-ink bg-base-surface px-4 py-3 font-mono text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo sm:text-sm" />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold sm:items-center">
                <input type="checkbox" name="uniqueCodeEnabled" defaultChecked={initialUniqueCodeEnabled} className="mt-0.5 h-5 w-5 shrink-0 accent-black sm:mt-0" />
                <span>Aktifkan kode unik 3 digit pada nominal QRIS</span>
              </label>
            </div>
          </section>

          {/* Backup */}
          <section className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b-2 border-base-ink bg-accent-sky px-4 py-3 sm:px-5">
              <Database className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Backup & Telegram</h2>
                <p className="text-xs text-base-ink/65">Backup otomatis database ke Telegram</p>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="telegramBotToken" label="Telegram Bot Token" type="password" defaultValue={initialTelegramBotToken} placeholder="123456:ABC-DEF..." autoComplete="off" />
                <Input name="telegramChatId" label="Telegram Chat ID" defaultValue={initialTelegramChatId} placeholder="-1001234567890" autoComplete="off" />
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                <Input name="backupInterval" label="Interval" type="number" min={1} max={100000} defaultValue={initialBackupInterval} />
                <div>
                  <label className="mb-1.5 block text-sm font-bold">Satuan</label>
                  <select name="backupUnit" defaultValue={initialBackupUnit} className="w-full rounded-neo border-2 border-base-ink bg-base-surface px-4 py-2.5 text-base shadow-neo-sm outline-none focus:shadow-neo">
                    <option value="minutes">Menit</option>
                    <option value="hours">Jam</option>
                    <option value="days">Hari</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold">
                    <input name="backupEnabled" type="checkbox" defaultChecked={initialBackupEnabled} className="h-5 w-5 accent-black" />
                    Aktif
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-24">
          <section className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo">
            <div className="flex items-center gap-3 border-b-2 border-base-ink bg-accent-sky px-4 py-3 sm:px-5">
              <Smartphone className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Notification Forwarder</h2>
                <p className="text-xs text-base-ink/65">Secret untuk aplikasi Android</p>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <label htmlFor="forwarderSecret" className="mb-1.5 block text-sm font-bold">Forwarder Secret</label>
                <div className="relative">
                  <Input id="forwarderSecret" name="forwarderSecret" type={showForwarder ? "text" : "password"} value={forwarderSecret} onChange={(e) => setForwarderSecret(e.target.value)} placeholder="Generate atau masukkan secret" autoComplete="off" className="pr-11 font-mono text-xs sm:text-sm" />
                  <button type="button" onClick={() => setShowForwarder((v) => !v)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-base-ink/55 hover:bg-base-bg hover:text-base-ink" aria-label={showForwarder ? "Sembunyikan" : "Tampilkan"}>
                    {showForwarder ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setForwarderSecret(generateSecret()); setShowForwarder(true); setCopied(false); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-2 border-base-ink bg-accent-sun px-3 py-2 text-sm font-bold shadow-neo-sm transition-transform active:translate-y-0.5">
                  <RefreshCw className="h-4 w-4" /> Generate
                </button>
                <button type="button" onClick={handleCopy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-2 border-base-ink bg-accent-mint px-3 py-2 text-sm font-bold shadow-neo-sm transition-transform active:translate-y-0.5">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Tersalin" : "Salin"}
                </button>
              </div>
              <div className="rounded-neo border-2 border-base-ink bg-base-bg p-3">
                <div className="mb-3 text-xs font-black uppercase tracking-wider text-base-ink/55">Set di aplikasi HP</div>
                <dl className="space-y-2 text-sm">
                  <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2">
                    <dt className="font-semibold text-base-ink/60">Param 1</dt>
                    <dd className="rounded bg-base-surface px-2 py-1 font-mono font-bold">secret</dd>
                  </div>
                  <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2">
                    <dt className="font-semibold text-base-ink/60">Value 1</dt>
                    <dd className="min-w-0 break-all rounded bg-base-surface px-2 py-1 font-mono text-xs font-bold">{showForwarder ? forwarderSecret : "••••••••••••••••••••••••"}</dd>
                  </div>
                </dl>
              </div>
              <p className="text-xs leading-relaxed text-base-ink/60">Setelah generate, klik <strong>Simpan Pengaturan</strong>. Lalu salin Value 1 ke aplikasi forwarder.</p>
            </div>
          </section>

          {error && <div className="rounded-neo border-2 border-base-ink bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-mint px-4 py-3 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.5} /> Pengaturan berhasil disimpan.
            </motion.div>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={saving} className="w-full text-base sm:text-lg">
            <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
