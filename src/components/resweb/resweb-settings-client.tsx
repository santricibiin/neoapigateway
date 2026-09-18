"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Copy, Check, Eye, EyeOff, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateResellerPassword, updateResellerApiKey } from "@/app/actions/resweb-auth";
import { useT } from "@/lib/lang";

type Reseller = { id: number; name: string; email: string; apiKey: string | null };

function generateApiKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "res_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ReswebSettingsClient({ reseller }: { reseller: Reseller | null }) {
  const t = useT();
  const [pwMode, setPwMode] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);

  const [apiKey, setApiKey] = useState(reseller?.apiKey || "");
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keyOk, setKeyOk] = useState(false);

  async function handlePassword(formData: FormData) {
    setPwSaving(true);
    setPwError(null);
    setPwOk(false);
    const result = await updateResellerPassword(formData);
    setPwSaving(false);
    if (!result.ok) {
      setPwError(result.error || "Gagal mengubah password");
    } else {
      setPwOk(true);
      setPwMode(false);
    }
  }

  async function handleApiKey(formData: FormData) {
    setKeySaving(true);
    setKeyError(null);
    setKeyOk(false);
    const result = await updateResellerApiKey(formData);
    setKeySaving(false);
    if (!result.ok) {
      setKeyError(result.error || "Gagal menyimpan API key");
    } else {
      setKeyOk(true);
      if (result.apiKey) setApiKey(result.apiKey);
    }
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-neo border border-base-line bg-gradient-to-br from-accent-skySoft via-base-surface to-accent-sandSoft/60 p-5 shadow-neo sm:p-8"
      >
        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
          viewBox="0 0 120 120"
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 text-white/40"
          aria-hidden
        >
          <circle cx="60" cy="60" r="42" fill="none" stroke="currentColor" strokeWidth="10" />
          <circle cx="60" cy="60" r="18" fill="currentColor" />
        </motion.svg>
        <div className="relative">
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 18 }}
            className="inline-flex items-center gap-2 rounded-full border border-base-line bg-base-surface px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-neo-sm"
          >
            <Sparkles className="h-3 w-3 text-accent-terra" /> Pengaturan
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
          >
            Pengaturan Akun
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-1 text-sm font-bold text-base-ink/60">
            {reseller?.email}
          </motion.p>
        </div>
      </motion.section>

      {pwOk && <p className="rounded-neo border border-base-line bg-accent-mint p-3 text-sm font-bold">{t("Password berhasil diubah.")}</p>}
      {keyOk && <p className="rounded-neo border border-base-line bg-accent-mint p-3 text-sm font-bold">{t("API key berhasil disimpan.")}</p>}

      <section className="rounded-neo border border-base-line bg-base-surface p-5 shadow-neo-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-base-line pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-neo border border-base-line bg-accent-sky shadow-neo-sm"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-black">{t("Password")}</h2>
            <p className="text-xs font-bold text-base-ink/50">{t("Ubah password login Anda")}</p>
          </div>
        </div>

        {pwError && <p className="mt-4 rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold">{pwError}</p>}

        {pwMode ? (
          <form action={handlePassword} className="mt-4 space-y-4">
            <Input name="currentPassword" label={t("Password lama")} type="password" required minLength={1} />
            <Input name="newPassword" label={t("Password baru (min 6 karakter)")} type="password" required minLength={6} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { setPwMode(false); setPwError(null); }}>{t("Batal")}</Button>
              <Button type="submit" variant="primary" disabled={pwSaving}>{pwSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("Menyimpan...")}</> : t("Simpan Password")}</Button>
            </div>
          </form>
        ) : (
          <div className="mt-4">
            <Button variant="outline" onClick={() => { setPwMode(true); setPwError(null); setPwOk(false); }}>{t("Ubah Password")}</Button>
          </div>
        )}
      </section>

      <section className="rounded-neo border border-base-line bg-base-surface p-5 shadow-neo-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-base-line pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-neo border border-base-line bg-accent-sun shadow-neo-sm"><KeyRound className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-black">API Key</h2>
            <p className="text-xs font-bold text-base-ink/50">{t("Key untuk autentikasi API reseller")}</p>
          </div>
        </div>

        {keyError && <p className="mt-4 rounded-neo border border-base-line bg-accent-terraSoft p-3 text-sm font-bold">{keyError}</p>}

        <form action={handleApiKey} className="mt-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-base-ink">API Key</label>
            <div className="flex gap-2">
              <input
                name="apiKey"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setApiKeyCopied(false); setKeyOk(false); }}
                placeholder={t("Klik generate untuk membuat API key")}
                maxLength={128}
                className="h-[42px] flex-1 rounded-neo border border-base-line bg-base-surface px-4 font-mono text-sm text-base-ink shadow-neo-sm outline-none transition-shadow focus:shadow-neo"
              />
              <Button type="button" variant="sky" title="Generate API key acak" onClick={() => { setApiKey(generateApiKey()); setApiKeyCopied(false); setKeyOk(false); }}>
                <KeyRound className="h-4 w-4" />
              </Button>
              {apiKey && (
                <Button type="button" variant="outline" title="Salin API key" onClick={() => { navigator.clipboard.writeText(apiKey); setApiKeyCopied(true); }}>
                  {apiKeyCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
            </div>
            {reseller?.apiKey && (
              <p className="text-xs font-bold text-base-ink/45">{t("API key saat ini sudah diset. Generate untuk mengganti.")}</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={keySaving || !apiKey}>{keySaving ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("Menyimpan...")}</> : t("Simpan API Key")}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
