"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
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
}: {
  initialSecretKey: string;
  initialPin: string;
  initialQrisProvider: string;
  initialQrisStatic: string;
  initialQrisTtlMinutes: number;
  initialForwarderSecret: string;
  initialUniqueCodeEnabled: boolean;
}) {
  const [showKey, setShowKey] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showForwarder, setShowForwarder] = useState(false);
  const [forwarderSecret, setForwarderSecret] = useState(
    initialForwarderSecret || generateSecret()
  );
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 sm:mb-7">
        <span className="mb-2 inline-flex items-center gap-2 rounded-full border-2 border-base-ink bg-accent-mint px-3 py-1 text-xs font-black uppercase tracking-wider">
          <ShieldCheck className="h-3.5 w-3.5" />
          Konfigurasi Aman
        </span>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Pengaturan Sistem</h1>
        <p className="mt-1 max-w-2xl text-sm text-base-ink/60 sm:text-base">
          Kelola koneksi reseller, pembayaran QRIS, dan autentikasi notifikasi.
        </p>
      </div>

      <form action={handleSubmit} className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)]">
        <div className="space-y-4 sm:space-y-6">
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
                  <Input
                    id="secretKey"
                    name="secretKey"
                    type={showKey ? "text" : "password"}
                    defaultValue={initialSecretKey}
                    placeholder="Masukkan Secret Key"
                    autoComplete="off"
                    className="min-w-0 pr-11 font-mono text-sm"
                  />
                  <button type="button" onClick={() => setShowKey((value) => !value)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-base-ink/55 hover:bg-base-bg hover:text-base-ink" aria-label={showKey ? "Sembunyikan secret key" : "Tampilkan secret key"}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="pin" className="mb-1.5 block text-sm font-bold">PIN</label>
                <div className="relative">
                  <Input
                    id="pin"
                    name="pin"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    defaultValue={initialPin}
                    placeholder="6 digit PIN"
                    autoComplete="off"
                    className="pr-11 font-mono"
                  />
                  <button type="button" onClick={() => setShowPin((value) => !value)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-base-ink/55 hover:bg-base-bg hover:text-base-ink" aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}>
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

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
                  <select id="qrisProvider" name="qrisProvider" defaultValue={initialQrisProvider} className="w-full rounded-neo border-2 border-base-ink bg-base-surface px-4 py-2.5 text-base text-base-ink shadow-neo-sm outline-none focus:shadow-neo">
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
                <textarea id="qrisStatic" name="qrisStatic" defaultValue={initialQrisStatic} placeholder="00020101021126...6304ABCD" rows={5} className="w-full resize-y rounded-neo border-2 border-base-ink bg-base-surface px-4 py-3 font-mono text-xs leading-relaxed text-base-ink shadow-neo-sm outline-none focus:shadow-neo sm:text-sm" />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold sm:items-center">
                <input type="checkbox" name="uniqueCodeEnabled" defaultChecked={initialUniqueCodeEnabled} className="mt-0.5 h-5 w-5 shrink-0 accent-black sm:mt-0" />
                <span>Aktifkan kode unik 3 digit pada nominal QRIS</span>
              </label>
            </div>
          </section>
        </div>

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
                  <Input id="forwarderSecret" name="forwarderSecret" type={showForwarder ? "text" : "password"} value={forwarderSecret} onChange={(event) => setForwarderSecret(event.target.value)} placeholder="Generate atau masukkan secret" autoComplete="off" className="pr-11 font-mono text-xs sm:text-sm" />
                  <button type="button" onClick={() => setShowForwarder((value) => !value)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-base-ink/55 hover:bg-base-bg hover:text-base-ink" aria-label={showForwarder ? "Sembunyikan forwarder secret" : "Tampilkan forwarder secret"}>
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
