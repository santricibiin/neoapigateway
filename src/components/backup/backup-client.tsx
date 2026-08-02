"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Database,
  FileArchive,
  Loader2,
  RefreshCw,
  Save,
  Send,
  HardDriveDownload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSettings } from "@/app/actions/settings";

interface SqlFile {
  name: string;
  size: number;
  mtime: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function BackupClient({
  initialEnabled,
  initialInterval,
  initialUnit,
  initialBotToken,
  initialChatId,
}: {
  initialEnabled: boolean;
  initialInterval: number;
  initialUnit: string;
  initialBotToken: string;
  initialChatId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backing, setBacking] = useState(false);
  const [backupResult, setBackupResult] = useState<string | null>(null);
  const [sqlFiles, setSqlFiles] = useState<SqlFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [autoBackup, setAutoBackup] = useState(initialEnabled);

  async function loadFiles() {
    setLoadingFiles(true);
    try {
      const res = await fetch("/api/admin/backup");
      const data = await res.json();
      if (data.ok) {
        setSqlFiles(
          (data.sqlFiles || []).map((raw: string) => {
            const [name, size, mtime] = raw.split("|");
            return { name, size: Number(size), mtime };
          })
        );
        setAutoBackup(data.settings?.enabled ?? false);
      }
    } catch {}
    setLoadingFiles(false);
  }

  useEffect(() => {
    loadFiles();
  }, []);

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

  async function handleBackupNow() {
    setBacking(true);
    setBackupResult(null);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setBackupResult(`Backup ${data.file} berhasil${data.sent ? " & terkirim ke Telegram" : " (gagal kirim Telegram)"}`);
      } else {
        setBackupResult(`Gagal: ${data.error || "unknown error"}`);
      }
    } catch {
      setBackupResult("Gagal: network error");
    }
    setBacking(false);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky shadow-neo-sm">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-black">Backup & Restore</h1>
          <p className="text-sm font-semibold text-base-ink/55">Backup otomatis database ke Telegram</p>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <section className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-sm">
          <div className="flex items-center gap-3 border-b-2 border-base-ink bg-accent-lavender px-4 py-3 sm:px-5">
            <Send className="h-5 w-5" strokeWidth={2.5} />
            <div>
              <h2 className="font-extrabold">Telegram Config</h2>
              <p className="text-xs text-base-ink/65">Bot token & chat ID untuk kirim backup</p>
            </div>
          </div>
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
            <Input name="telegramBotToken" label="Bot Token" type="password" defaultValue={initialBotToken} placeholder="123456:ABC-DEF..." autoComplete="off" />
            <Input name="telegramChatId" label="Chat ID" defaultValue={initialChatId} placeholder="-1001234567890 atau 123456789" autoComplete="off" />
          </div>
        </section>

        <section className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-sm">
          <div className="flex items-center gap-3 border-b-2 border-base-ink bg-accent-sun px-4 py-3 sm:px-5">
            <RefreshCw className="h-5 w-5" strokeWidth={2.5} />
            <div>
              <h2 className="font-extrabold">Jadwal Backup Otomatis</h2>
              <p className="text-xs text-base-ink/65">Interval backup dalam menit, jam, atau hari (WIB)</p>
            </div>
          </div>
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[1fr_1fr_auto]">
            <Input name="backupInterval" label="Interval" type="number" min={1} max={100000} defaultValue={initialInterval} />
            <div>
              <label className="mb-1.5 block text-sm font-bold">Satuan</label>
              <select name="backupUnit" defaultValue={initialUnit} className="w-full rounded-neo border-2 border-base-ink bg-base-surface px-4 py-2.5 text-base shadow-neo-sm outline-none focus:shadow-neo">
                <option value="minutes">Menit</option>
                <option value="hours">Jam</option>
                <option value="days">Hari</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-3 rounded-neo border-2 border-base-ink bg-base-bg p-3 text-sm font-bold">
                <input name="backupEnabled" type="checkbox" defaultChecked={initialEnabled} className="h-5 w-5 accent-black" />
                Aktif
              </label>
            </div>
          </div>
        </section>

        {error && <div className="rounded-neo border-2 border-base-ink bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-mint px-4 py-3 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.5} /> Pengaturan backup disimpan.
          </motion.div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" size="lg" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
          <Button type="button" variant="sky" size="lg" disabled={backing} onClick={handleBackupNow}>
            {backing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
            {backing ? "Membackup..." : "Backup Sekarang"}
          </Button>
        </div>
      </form>

      {backupResult && (
        <div className={`rounded-neo border-2 border-base-ink px-4 py-3 text-sm font-semibold ${backupResult.startsWith("Gagal") ? "bg-red-100 text-red-700" : "bg-accent-mint"}`}>
          {backupResult}
        </div>
      )}

      <section className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-sm">
        <div className="flex items-center justify-between border-b-2 border-base-ink bg-accent-mint px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <HardDriveDownload className="h-5 w-5" strokeWidth={2.5} />
            <div>
              <h2 className="font-extrabold">File Backup di Server</h2>
              <p className="text-xs text-base-ink/65">File .sql / .zip di /root/neoapigateway/</p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={loadFiles} disabled={loadingFiles}>
            {loadingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
        <div className="p-4 sm:p-5">
          {loadingFiles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-base-ink/40" />
            </div>
          ) : sqlFiles.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-base-ink/50">Belum ada file backup di server.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-base-ink bg-base-bg text-xs font-black uppercase tracking-wider text-base-ink/70">
                    <th className="px-3 py-2">File</th>
                    <th className="px-3 py-2 text-right">Ukuran</th>
                    <th className="px-3 py-2">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {sqlFiles.map((file, i) => (
                    <tr key={file.name} className={`border-b border-base-ink/10 ${i % 2 === 0 ? "bg-base-surface" : "bg-base-bg/50"}`}>
                      <td className="px-3 py-2.5 font-mono text-xs font-bold">{file.name}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{formatBytes(file.size)}</td>
                      <td className="px-3 py-2.5 text-xs text-base-ink/60">{formatDate(file.mtime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-base-ink/50">
            Untuk restore, jalankan <code className="rounded bg-base-ink/10 px-1 font-mono">bash deploy.sh</code> di server → pilih menu <strong>Restore Backup</strong>.
          </p>
        </div>
      </section>
    </div>
  );
}
