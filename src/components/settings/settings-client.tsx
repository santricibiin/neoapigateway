"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, KeyRound, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSettings } from "@/app/actions/settings";

export function SettingsClient({
  initialSecretKey,
  initialPin,
}: {
  initialSecretKey: string;
  initialPin: string;
}) {
  const [showKey, setShowKey] = useState(false);
  const [showPin, setShowPin] = useState(false);
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

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Pengaturan</h1>
        <p className="text-sm text-base-ink/60">
          Atur Secret Key dan PIN untuk koneksi API BandelBanget
        </p>
      </div>

      <form action={handleSubmit} className="space-y-5">
        <div className="rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo-sm">
          <label className="mb-2 flex items-center gap-2 text-sm font-bold">
            <KeyRound className="h-4 w-4" strokeWidth={2.5} />
            Secret Key
          </label>
          <div className="relative">
            <Input
              name="secretKey"
              type={showKey ? "text" : "password"}
              defaultValue={initialSecretKey}
              placeholder="Masukkan Secret Key"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-ink/50 hover:text-base-ink"
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="rounded-neo border-2 border-base-ink bg-base-surface p-5 shadow-neo-sm">
          <label className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Lock className="h-4 w-4" strokeWidth={2.5} />
            PIN
          </label>
          <div className="relative">
            <Input
              name="pin"
              type={showPin ? "text" : "password"}
              defaultValue={initialPin}
              placeholder="Masukkan PIN (6 digit)"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-ink/50 hover:text-base-ink"
            >
              {showPin ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-neo border-2 border-base-ink bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-mint px-4 py-3 text-sm font-semibold"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
            Pengaturan berhasil disimpan!
          </motion.div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={saving}
          className="w-full"
        >
          <Save className="h-4 w-4" />
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </form>
    </div>
  );
}
