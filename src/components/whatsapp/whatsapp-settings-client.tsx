"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWaSettings, requestWaPairingCode, clearWaPairing, saveWaSettings } from "@/app/actions/whatsapp";
import { CheckCircle2, Loader2, MessageCircle, Phone, RefreshCw, Save, Smartphone, XCircle } from "lucide-react";

interface WaStatus {
  ok: boolean;
  waEnabled: boolean;
  waPhoneNumber: string;
  pairingCode: string | null;
  pairingPending: boolean;
  registered: boolean;
}

export function WhatsappSettingsClient({ initial }: { initial: { waEnabled: boolean; waPhoneNumber: string } }) {
  const [waEnabled, setWaEnabled] = useState(initial.waEnabled);
  const [waPhoneNumber, setWaPhoneNumber] = useState(initial.waPhoneNumber);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [requesting, setRequesting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/wa/status", { cache: "no-store" });
      const data = await r.json();
      if (data.ok) setStatus(data as WaStatus);
    } catch {}
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const res = await saveWaSettings(fd);
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Gagal menyimpan");
      return;
    }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
    void refresh();
  }

  async function handlePair() {
    setRequesting(true);
    setError(null);
    const res = await requestWaPairingCode();
    if (!res.ok) {
      setError(res.error || "Gagal meminta kode");
      setRequesting(false);
      return;
    }
    // Tunggu runner memproses (poll sampai kode muncul).
    setTimeout(() => setRequesting(false), 3000);
  }

  async function handleClear() {
    await clearWaPairing();
    void refresh();
  }

  const connected = status?.registered ?? false;
  const pairingCode = status?.pairingCode ?? null;
  const pairingPending = status?.pairingPending ?? false;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-mint shadow-neo-sm">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-black">Bot WhatsApp</h1>
            <p className="text-sm font-semibold text-base-ink/55">Kirim detail produk otomatis ke WhatsApp buyer saat transaksi sukses</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border-2 border-base-ink px-3 py-1 text-xs font-black uppercase ${
            connected ? "bg-accent-mint" : "bg-red-200"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-600" : "bg-red-500"}`} />
          {connected ? "Terhubung" : "Belum Login"}
        </span>
      </div>

      {error ? (
        <p className="rounded-neo border-2 border-base-ink bg-red-200 p-3 text-sm font-bold">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-neo border-2 border-base-ink bg-accent-mint p-3 text-sm font-bold">Pengaturan tersimpan</p>
      ) : null}

      <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo">
        <label className="flex items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            name="waEnabled"
            checked={waEnabled}
            onChange={(e) => setWaEnabled(e.target.checked)}
            className="h-5 w-5 accent-black"
          />
          Aktifkan bot WhatsApp
        </label>

        <Input
          name="waPhoneNumber"
          label="Nomor WhatsApp bot (format 62xxxxxxxxxx)"
          type="tel"
          placeholder="6281234567890"
          value={waPhoneNumber}
          onChange={(e) => setWaPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
          maxLength={15}
        />
        <p className="-mt-2 text-xs font-semibold text-base-ink/50">
          Nomor ini dipakai login bot via pairing code. Pastikan nomor aktif dan bisa menerima WhatsApp.
        </p>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>

      {/* Pairing */}
      <div className="flex flex-col gap-4 rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          <h2 className="text-sm font-black uppercase tracking-wider text-base-ink/50">Login via Pairing Code</h2>
        </div>

        {connected ? (
          <div className="flex items-center gap-3 rounded-neo border-2 border-base-ink bg-accent-mint p-4">
            <CheckCircle2 className="h-6 w-6 shrink-0" strokeWidth={2.5} />
            <div>
              <p className="font-black">Bot sudah terhubung</p>
              <p className="text-xs font-semibold text-base-ink/60">
                Nomor {status?.waPhoneNumber} aktif dan siap mengirim produk ke buyer.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ol className="space-y-2 text-sm font-semibold text-base-ink/70">
              <li>1. Pastikan pengaturan sudah disimpan dan bot diaktifkan.</li>
              <li>2. Klik <span className="font-extrabold text-base-ink">Minta Kode Pairing</span> di bawah.</li>
              <li>3. Buka WhatsApp di HP → Settings → Linked Devices → Link a Device → Link with phone number.</li>
              <li>4. Masukkan kode yang muncul di sini.</li>
            </ol>

            {pairingCode ? (
              <div className="rounded-neo border-2 border-base-ink bg-accent-sun p-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-base-ink/60">Kode Pairing</p>
                <p className="mt-1 font-mono text-3xl font-black tracking-[0.3em]">{pairingCode}</p>
                <p className="mt-2 text-xs font-bold text-base-ink/60">Masukkan kode ini di WhatsApp dalam 60 detik</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void handleClear()}>
                  <XCircle className="h-3.5 w-3.5" />
                  Hapus Kode
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-neo border-2 border-dashed border-base-ink/30 bg-base-bg p-4">
                <p className="text-xs font-semibold text-base-ink/50">
                  {pairingPending || requesting ? "Meminta kode dari server..." : "Belum ada kode aktif."}
                </p>
                <Button type="button" variant="sky" disabled={requesting || pairingPending} onClick={() => void handlePair()}>
                  {requesting || pairingPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                  Minta Kode Pairing
                </Button>
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-2 text-xs font-semibold text-base-ink/40">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Status diperbarui otomatis setiap 3 detik
        </div>
      </div>

      {/* Cara kerja */}
      <div className="rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo">
        <h2 className="text-sm font-black uppercase tracking-wider text-base-ink/50">Cara Kerja</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold text-base-ink/70">
          <li>• Buyer mengisi nomor WhatsApp (opsional) di halaman order.</li>
          <li>• Saat pembayaran sukses, bot mengirim invoice + detail produk ke WA buyer.</li>
          <li>• Detail produk tetap tampil di web — WhatsApp hanya saluran kedua.</li>
          <li>• Runner <code className="rounded bg-base-ink/10 px-1 font-mono text-xs">poll-wa</code> harus jalan (otomatis via <code className="rounded bg-base-ink/10 px-1 font-mono text-xs">npm run dev</code> / deploy).</li>
        </ul>
      </div>
    </div>
  );
}
