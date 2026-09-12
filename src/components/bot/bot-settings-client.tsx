"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  KeyRound,
  MessageSquareText,
  Save,
  Send,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveBotSettings } from "@/app/actions/bot";

export function BotSettingsClient({
  initial,
}: {
  initial: {
    botEnabled: boolean;
    telegramBotToken: string;
    notifyChannelId: string;
    forceJoinOn: boolean;
    forceJoinLink: string;
    forceJoinChatId: string;
    welcomeText: string;
    categoryText: string;
    productListText: string;
    productDetailText: string;
    qrisInvoiceText: string;
    paymentSuccessText: string;
    thankYouText: string;
    qrisExpiredText: string;
  };
}) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setSuccess(false);
    setError(null);
    const res = await saveBotSettings(formData);
    setSaving(false);
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(res.error ?? "Terjadi kesalahan");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-5 sm:mb-7">
        <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-base-line bg-accent-sky px-3 py-1 text-xs font-black uppercase tracking-wider">
          <Bot className="h-3.5 w-3.5" />
          Bot Telegram
        </span>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Katalog Bot Telegram</h1>
        <p className="mt-1 max-w-2xl text-sm text-base-ink/60 sm:text-base">
          Konfigurasi bot katalog: token, force join, notifikasi channel, dan template pesan.
        </p>
      </div>

      <form action={handleSubmit} className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.6fr)]">
        <div className="space-y-4 sm:space-y-6">
          <section className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b border-base-line bg-accent-sky px-4 py-3 sm:px-5">
              <KeyRound className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Koneksi Bot</h2>
                <p className="text-xs text-base-ink/65">Token dari @BotFather</p>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <Input name="telegramBotToken" label="Telegram Bot Token" defaultValue={initial.telegramBotToken} placeholder="123456:ABC-DEF..." autoComplete="off" />
              <label className="flex cursor-pointer items-start gap-3 rounded-neo border border-base-line bg-base-bg p-3 text-sm font-bold sm:items-center">
                <input type="checkbox" name="botEnabled" defaultChecked={initial.botEnabled} className="mt-0.5 h-5 w-5 shrink-0 accent-black sm:mt-0" />
                <span>Aktifkan bot katalog</span>
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b border-base-line bg-accent-lavender px-4 py-3 sm:px-5">
              <Send className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Notifikasi & Force Join</h2>
                <p className="text-xs text-base-ink/65">Channel transaksi sukses & wajib join</p>
              </div>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <Input name="notifyChannelId" label="Channel Notif Transaksi (@username / -100…)" defaultValue={initial.notifyChannelId} placeholder="@namachannel" autoComplete="off" />
              <label className="flex cursor-pointer items-start gap-3 rounded-neo border border-base-line bg-base-bg p-3 text-sm font-bold sm:items-center">
                <input type="checkbox" name="forceJoinOn" defaultChecked={initial.forceJoinOn} className="mt-0.5 h-5 w-5 shrink-0 accent-black sm:mt-0" />
                <span>Aktifkan wajib join channel untuk user baru</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="forceJoinLink" label="Link Channel (https://t.me/…)" defaultValue={initial.forceJoinLink} placeholder="https://t.me/channel" autoComplete="off" />
                <Input name="forceJoinChatId" label="Chat ID Channel (@username / -100…)" defaultValue={initial.forceJoinChatId} placeholder="-1001234567890" autoComplete="off" />
              </div>
              <p className="text-xs leading-relaxed text-base-ink/60">
                Ambil Chat ID channel dengan kirim <code className="rounded bg-base-bg px-1 font-mono">/getid</code> ke bot setelah aktif.
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-sm">
            <div className="flex items-center gap-3 border-b border-base-line bg-accent-sun px-4 py-3 sm:px-5">
              <MessageSquareText className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Template Pesan (MarkdownV2)</h2>
                <p className="text-xs text-base-ink/65">Placeholder {`{name} {produk} {invoice} {produk_items}`} dst.</p>
              </div>
            </div>
            <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Welcome</label>
                <textarea name="welcomeText" defaultValue={initial.welcomeText} rows={5} className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Kategori {`{kategori}`}</label>
                <textarea name="categoryText" defaultValue={initial.categoryText} rows={5} className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">List Produk {`{produk}`}</label>
                <textarea name="productListText" defaultValue={initial.productListText} rows={5} className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Detail Produk</label>
                <textarea name="productDetailText" defaultValue={initial.productDetailText} rows={5} className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Invoice QRIS {`{invoice}`}</label>
                <textarea name="qrisInvoiceText" defaultValue={initial.qrisInvoiceText} rows={5} className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Pembayaran Sukses {`{produk_items}`}</label>
                <textarea name="paymentSuccessText" defaultValue={initial.paymentSuccessText} rows={5} className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Terima Kasih</label>
                <textarea name="thankYouText" defaultValue={initial.thankYouText} rows={5} className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">QRIS Kedaluwarsa</label>
                <textarea name="qrisExpiredText" defaultValue={initial.qrisExpiredText} rows={5} className="w-full resize-y rounded-neo border border-base-line bg-base-surface px-4 py-3 text-xs leading-relaxed shadow-neo-sm outline-none focus:shadow-neo" />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-24">
          <section className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo">
            <div className="flex items-center gap-3 border-b border-base-line bg-accent-mint px-4 py-3 sm:px-5">
              <Lock className="h-5 w-5" strokeWidth={2.5} />
              <div>
                <h2 className="font-extrabold">Cara Menjalankan</h2>
                <p className="text-xs text-base-ink/65">Polling bot berjalan terpisah</p>
              </div>
            </div>
            <div className="space-y-2 p-4 sm:p-5 text-sm">
              <p>1. Simpan token & aktifkan bot di bawah.</p>
              <p>2. Jalankan polling di terminal:</p>
              <pre className="rounded-neo border border-base-line bg-base-bg px-3 py-2 font-mono text-xs">npm run bot:poll</pre>
              <p>3. Kirim <code className="rounded bg-base-bg px-1 font-mono">/start</code> ke bot.</p>
            </div>
          </section>

          {error && <div className="rounded-neo border border-base-line bg-accent-terraSoft px-4 py-3 text-sm font-semibold text-accent-terraDeep">{error}</div>}
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-neo border border-base-line bg-accent-mint px-4 py-3 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.5} /> Pengaturan bot disimpan.
            </motion.div>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={saving} className="w-full text-base sm:text-lg">
            <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Pengaturan Bot"}
          </Button>
        </div>
      </form>
    </div>
  );
}
