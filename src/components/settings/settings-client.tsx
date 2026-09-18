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
  Send,
  Coins,
  Wrench,
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
  initialBandelPassword,
  initialQrisProvider,
  initialQrisStatic,
  initialQrisTtlMinutes,
  initialForwarderSecret,
  initialUniqueCodeEnabled,
  initialSiteName,
  initialCsTelegram,
  initialCsWhatsapp,
  initialBinance,
  initialGopay2,
  hasLogo,
  initialMaintenance,
}: {
  initialSecretKey: string;
  initialPin: string;
  initialBandelPassword: string;
  initialQrisProvider: string;
  initialQrisStatic: string;
  initialQrisTtlMinutes: number;
  initialForwarderSecret: string;
  initialUniqueCodeEnabled: boolean;
  initialSiteName: string;
  initialCsTelegram: string;
  initialCsWhatsapp: string;
  initialBinance: { enabled: boolean; uid: string; addresses: Record<string, string>; rate: number };
  initialGopay2: { baseUrl: string; apiKey: string; qrisStatic: string };
  hasLogo: boolean;
  initialMaintenance: { enabled: boolean; text: string };
}) {
  const [showKey, setShowKey] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showBandelPw, setShowBandelPw] = useState(false);
  const [showForwarder, setShowForwarder] = useState(false);
  const [showGopay2Key, setShowGopay2Key] = useState(false);
  const [qrisProvider, setQrisProvider] = useState(initialQrisProvider);
  const useGopay2 = qrisProvider === "gopaymerchant2";
  const [forwarderSecret, setForwarderSecret] = useState(initialForwarderSecret || generateSecret());
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(hasLogo ? "/api/brand/logo" : null);
  const [maintenanceOn, setMaintenanceOn] = useState(initialMaintenance.enabled);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setSuccess(null);
    setError(null);
    const res = await saveSettings(formData);
    setSaving(false);
    if (res.ok) {
      setSuccess(res.message || "Pengaturan berhasil disimpan.");
      setTimeout(() => setSuccess(null), 5000);
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
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-6 relative overflow-hidden rounded-neo border border-base-line bg-accent-mint p-5 shadow-neo sm:p-7"
      >
        <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 text-white/30">
          <path d="M50 6 61 38 95 39 68 58 77 91 50 72 23 91 32 58 5 39 39 38Z" fill="currentColor" />
        </svg>
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-base-line bg-base-surface px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="h-3 w-3" /> Konfigurasi Sistem
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Pengaturan.</h1>
          <p className="mt-1 max-w-2xl text-sm font-bold text-base-ink/60">
            Kelola branding, koneksi reseller, pembayaran QRIS, dan notifikasi.
          </p>
        </div>
      </motion.section>

      <form action={handleSubmit} className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)]">
        <div className="space-y-4 sm:space-y-6">
          {/* Branding */}
          <section className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b border-base-line bg-accent-mint px-4 py-3 sm:px-5">
              <ImageIcon className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Branding Website</h2>
                <p className="text-xs text-base-ink/65">Nama & logo tampil di semua halaman</p>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <Input name="siteName" label="Nama Website" defaultValue={initialSiteName} placeholder="Neo API Gateway" maxLength={100} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="csTelegram" label="CS Telegram (username, tanpa @)" defaultValue={initialCsTelegram} placeholder="cskamu" maxLength={64} />
                <Input name="csWhatsapp" label="CS WhatsApp (format 62xxx)" defaultValue={initialCsWhatsapp} placeholder="6281234567890" maxLength={15} />
              </div>
              <p className="text-xs font-semibold text-base-ink/50">
                Kontak CS tampil di halaman Kontak landing page.
              </p>
              <div>
                <label className="mb-1.5 block text-sm font-bold">Logo Website</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-neo border border-base-line bg-base-bg">
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

          {/* Maintenance */}
          <section className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b border-base-line bg-accent-sunSoft px-4 py-3 sm:px-5">
              <Wrench className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Mode Maintenance</h2>
                <p className="text-xs text-base-ink/65">Tutup order sementara di halaman produk publik</p>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className={`flex items-center justify-between gap-4 rounded-neo border p-3 transition-colors ${maintenanceOn ? "border-accent-terra/40 bg-accent-terraSoft" : "border-base-line bg-base-bg"}`}>
                <div>
                  <p className="text-sm font-bold">{maintenanceOn ? "Maintenance AKTIF" : "Maintenance nonaktif"}</p>
                  <p className="text-xs font-semibold text-base-ink/55">
                    {maintenanceOn ? "Halaman produk menampilkan halaman maintenance & order ditolak." : "Produk dapat dibeli normal."}
                  </p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    name="maintenanceEnabled"
                    checked={maintenanceOn}
                    onChange={(e) => setMaintenanceOn(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className={`h-7 w-12 rounded-full border-2 border-base-line shadow-neo-sm transition-colors after:absolute after:left-0.5 after:top-1/2 after:h-5 after:w-5 after:-translate-y-1/2 after:rounded-full after:border-2 after:border-base-line after:bg-base-surface after:transition-transform peer-checked:bg-accent-terra peer-checked:after:translate-x-5 ${maintenanceOn ? "bg-accent-terra" : "bg-base-surface"}`} />
                </label>
              </div>
              <div>
                <label htmlFor="maintenanceText" className="mb-1.5 block text-sm font-bold">Teks Informasi Maintenance</label>
                <textarea
                  id="maintenanceText"
                  name="maintenanceText"
                  defaultValue={initialMaintenance.text}
                  rows={4}
                  maxLength={1000}
                  placeholder={"Contoh:\nKami sedang melakukan pemeliharaan sistem.\nOrder dibuka kembali pukul 20:00 WIB.\nTerima kasih atas pengertian Anda."}
                  className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 text-sm leading-relaxed shadow-neo-sm outline-none focus:shadow-neo"
                />
                <p className="mt-1.5 text-xs font-semibold text-base-ink/50">Kosong = teks default. Mendukung baris baru, maks 1000 karakter.</p>
              </div>
            </div>
          </section>

          {/* Reseller */}
          <section className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b border-base-line bg-accent-lavender px-4 py-3 sm:px-5">
              <KeyRound className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Koneksi Reseller</h2>
                <p className="text-xs text-base-ink/65">Kredensial API Provider</p>
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
              <div className="md:col-span-2">
                <label htmlFor="bandelPassword" className="mb-1.5 block text-sm font-bold">Password Bandel</label>
                <div className="relative">
                  <Input id="bandelPassword" name="bandelPassword" type={showBandelPw ? "text" : "password"} defaultValue={initialBandelPassword} placeholder="Password dashboard bandel (10-20 char: besar, kecil, angka, simbol)" autoComplete="off" className="pr-11 font-mono" />
                  <button type="button" onClick={() => setShowBandelPw((v) => !v)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-base-ink/55 hover:bg-base-bg hover:text-base-ink" aria-label={showBandelPw ? "Sembunyikan" : "Tampilkan"}>
                    {showBandelPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-base-ink/50">Wajib sejak bandel memakai password + PIN. Kosong = pertahankan yang lama.</p>
              </div>
            </div>
          </section>

          {/* QRIS */}
          <section className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b border-base-line bg-accent-sun px-4 py-3 sm:px-5">
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
                  <select id="qrisProvider" name="qrisProvider" value={qrisProvider} onChange={(e) => setQrisProvider(e.target.value)} className="w-full rounded-neo border border-base-line bg-base-surface px-4 py-2.5 text-base shadow-neo-sm outline-none focus:shadow-neo">
                    <option value="none">Nonaktif</option>
                    <option value="dana">DANA</option>
                    <option value="gopay">GoPay Merchant</option>
                    <option value="gopaymerchant2">GoPay Merchant 2 (Gateway)</option>
                    <option value="nobu">Nobu/Neobank</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="qrisTtlMinutes" className="mb-1.5 flex items-center gap-2 text-sm font-bold"><Clock className="h-4 w-4" /> Berlaku (menit)</label>
                  <Input id="qrisTtlMinutes" name="qrisTtlMinutes" type="number" min={1} max={120} defaultValue={initialQrisTtlMinutes} disabled={useGopay2} />
                  {useGopay2 && <p className="mt-1 text-xs font-semibold text-base-ink/50">Gateway fix 5 menit.</p>}
                </div>
              </div>
              <div>
                <label htmlFor="qrisStatic" className="mb-1.5 block text-sm font-bold">QRIS Statis {useGopay2 && <span className="font-semibold text-base-ink/50">(tidak dipakai provider ini)</span>}</label>
                <textarea id="qrisStatic" name="qrisStatic" defaultValue={initialQrisStatic} placeholder="00020101021126...6304ABCD" rows={5} className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 font-mono text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo sm:text-sm" />
              </div>

              {useGopay2 && (
                <div className="space-y-4 rounded-neo border border-base-line bg-base-bg p-3 sm:p-4">
                  <div className="text-xs font-black uppercase tracking-wider text-base-ink/55">GoPay Merchant 2 — Gateway</div>
                  <Input name="gopay2BaseUrl" label="URL Gateway" defaultValue={initialGopay2.baseUrl} placeholder="http://127.0.0.1:3005" autoComplete="off" className="font-mono" />
                  <div>
                    <label htmlFor="gopay2ApiKey" className="mb-1.5 block text-sm font-bold">API Key Gateway</label>
                    <div className="relative">
                      <Input id="gopay2ApiKey" name="gopay2ApiKey" type={showGopay2Key ? "text" : "password"} defaultValue={initialGopay2.apiKey} placeholder="API key gateway (kosong = pertahankan lama)" autoComplete="off" className="pr-11 font-mono" />
                      <button type="button" onClick={() => setShowGopay2Key((v) => !v)} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-base-ink/55 hover:bg-base-surface hover:text-base-ink" aria-label={showGopay2Key ? "Sembunyikan" : "Tampilkan"}>
                        {showGopay2Key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="gopay2QrisStatic" className="mb-1.5 block text-sm font-bold">QRIS Statis GoBiz</label>
                    <textarea id="gopay2QrisStatic" name="gopay2QrisStatic" defaultValue={initialGopay2.qrisStatic} placeholder="00020101021126...6304ABCD (dari GoBiz, di-push ke gateway saat simpan)" rows={4} className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 font-mono text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo" />
                  </div>
                  <p className="text-xs leading-relaxed text-base-ink/60">
                    QRIS dinamis dibuat per order oleh gateway; lunas terdeteksi otomatis ≤ 15 detik. Saat simpan, QRIS statis GoBiz otomatis di-push ke gateway.
                  </p>
                </div>
              )}
              <label className="flex cursor-pointer items-start gap-3 rounded-neo border border-base-line bg-base-bg p-3 text-sm font-bold sm:items-center">
                <input type="checkbox" name="uniqueCodeEnabled" defaultChecked={initialUniqueCodeEnabled} className="mt-0.5 h-5 w-5 shrink-0 accent-black sm:mt-0" />
                <span>Aktifkan kode unik 3 digit pada nominal QRIS</span>
              </label>
            </div>
          </section>

          {/* Binance Pay & USDT */}
          <section className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b border-base-line bg-accent-lavender px-4 py-3 sm:px-5">
              <Coins className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Binance Pay & USDT</h2>
                <p className="text-xs text-base-ink/65">Pembayaran crypto otomatis (UID / deposit USDT)</p>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <label className="flex cursor-pointer items-center gap-3 rounded-neo border border-base-line bg-base-bg p-3 text-sm font-bold">
                <input name="binanceEnabled" type="checkbox" defaultChecked={initialBinance.enabled} className="h-5 w-5 accent-black" />
                Aktifkan pembayaran Binance
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="binanceApiKey" label="API Key" type="password" defaultValue="" placeholder="Kosong = pertahankan lama" autoComplete="off" />
                <Input name="binanceApiSecret" label="API Secret" type="password" defaultValue="" placeholder="Kosong = pertahankan lama" autoComplete="off" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="binanceUid" label="UID Binance Pay" defaultValue={initialBinance.uid} placeholder="1275360723" maxLength={12} autoComplete="off" />
                <Input name="binanceUsdtRate" label="Kurs (Rp per USDT)" type="number" min={1000} max={100000} defaultValue={initialBinance.rate} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="binanceTrc20" label="Alamat USDT TRC20" defaultValue={initialBinance.addresses?.TRC20 ?? ""} placeholder="T..." autoComplete="off" />
                <Input name="binanceBep20" label="Alamat USDT BEP20" defaultValue={initialBinance.addresses?.BEP20 ?? ""} placeholder="0x..." autoComplete="off" />
                <Input name="binanceErc20" label="Alamat USDT ERC20" defaultValue={initialBinance.addresses?.ERC20 ?? ""} placeholder="0x..." autoComplete="off" />
                <Input name="binanceSol" label="Alamat USDT SOL" defaultValue={initialBinance.addresses?.SOL ?? ""} placeholder="..." autoComplete="off" />
              </div>
              <p className="text-xs leading-relaxed text-base-ink/60">
                API key butuh izin <strong>read-only</strong> (endpoint pay/transactions &amp; deposit history). Deposit terdeteksi otomatis setelah confirmed di blockchain. Kurs manual dipakai untuk konversi harga produk ke USDT.
              </p>
            </div>
          </section>

          {/* Backup & notifikasi transaksi diatur di halaman Backup & Restore */}
        </div>

        {/* Right column */}
        <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-24">
          <section className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo">
            <div className="flex items-center gap-3 border-b border-base-line bg-accent-sky px-4 py-3 sm:px-5">
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
                <button type="button" onClick={() => { setForwarderSecret(generateSecret()); setShowForwarder(true); setCopied(false); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border border-base-line bg-accent-sun px-3 py-2 text-sm font-bold shadow-neo-sm transition-transform active:translate-y-0.5">
                  <RefreshCw className="h-4 w-4" /> Generate
                </button>
                <button type="button" onClick={handleCopy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border border-base-line bg-accent-mint px-3 py-2 text-sm font-bold shadow-neo-sm transition-transform active:translate-y-0.5">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Tersalin" : "Salin"}
                </button>
              </div>
              <div className="rounded-neo border border-base-line bg-base-bg p-3">
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

          {error && <div className="rounded-neo border border-base-line bg-accent-terraSoft px-4 py-3 text-sm font-semibold text-accent-terraDeep">{error}</div>}
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-neo border border-base-line bg-accent-mint px-4 py-3 text-sm font-semibold">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} /> {success}
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
