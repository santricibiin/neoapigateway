"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { readSettingsRaw } from "@/lib/settings-raw";
import { verifyQrisCrc } from "@/lib/qris";
import type { ActionResult } from "@/types";

const VALID_PROVIDERS = ["none", "dana", "nobu", "gopay"] as const;
const VALID_BACKUP_UNITS = ["minutes", "hours", "days"] as const;

export async function getSettings() {
  requireAdmin();
  return readSettingsRaw();
}

export async function saveSettings(
  formData: FormData
): Promise<ActionResult> {
  requireAdmin();
  const secretKey = formData.get("secretKey")?.toString().trim() ?? "";
  const pin = formData.get("pin")?.toString().trim() ?? "";
  const qrisProvider = formData.get("qrisProvider")?.toString().trim() ?? "none";
  const qrisStatic = formData.get("qrisStatic")?.toString().trim() ?? "";
  const qrisTtlMinutes = Number(formData.get("qrisTtlMinutes") ?? "5");
  const forwarderSecret = formData.get("forwarderSecret")?.toString().trim() ?? "";
  const uniqueCodeEnabled = formData.get("uniqueCodeEnabled") === "on";
  const telegramBotToken = formData.get("telegramBotToken")?.toString().trim() ?? "";
  const telegramChatId = formData.get("telegramChatId")?.toString().trim() ?? "";
  const siteName = formData.get("siteName")?.toString().trim() ?? "";
  const csTelegram = (formData.get("csTelegram")?.toString().trim() ?? "").replace(/^@/, "");
  const csWhatsapp = formData.get("csWhatsapp")?.toString().replace(/[^0-9]/g, "");

  // Preserve existing values jika field kosong (memungkinkan update section lain tanpa re-input)
  const existing = await prisma.setting.findUnique({ where: { id: 1 } });

  // Field backup hanya dikirim dari halaman Backup; kalau tidak ada, pertahankan nilai lama.
  // (Pakai backupInterval sebagai penanda — checkbox "Aktif" yang unchecked tidak ikut terkirim.)
  const hasBackupFields = formData.has("backupInterval") || formData.has("telegramBotToken");
  const backupEnabled = hasBackupFields
    ? formData.get("backupEnabled") === "on"
    : Boolean(existing?.backupEnabled);
  const backupInterval = hasBackupFields ? Number(formData.get("backupInterval") ?? "1440") : (existing?.backupInterval ?? 1440);
  const backupUnit = hasBackupFields ? formData.get("backupUnit")?.toString().trim() ?? "minutes" : (existing?.backupUnit ?? "minutes");
  // Channel notif transaksi (dikirim dari halaman Backup; preserve kalau tidak ada).
  const notifyChannelId = formData.has("notifyChannelId")
    ? formData.get("notifyChannelId")?.toString().trim() ?? ""
    : (existing?.notifyChannelId ?? "");

  // ===== Binance Pay (dikirim dari halaman Settings; preserve kalau tidak ada) =====
  const hasBinanceFields = formData.has("binanceUsdtRate");
  const binanceEnabled = hasBinanceFields ? formData.get("binanceEnabled") === "on" : Boolean(existing?.binanceEnabled);
  const binanceUid = hasBinanceFields ? formData.get("binanceUid")?.toString().trim() ?? "" : (existing?.binanceUid ?? "");
  const binanceApiKeyRaw = hasBinanceFields ? formData.get("binanceApiKey")?.toString().trim() ?? "" : "";
  const binanceApiSecretRaw = hasBinanceFields ? formData.get("binanceApiSecret")?.toString().trim() ?? "" : "";
  const binanceUsdtRate = hasBinanceFields ? Number(formData.get("binanceUsdtRate") ?? "16000") : (existing?.binanceUsdtRate ?? 16000);
  const usdtAddressesRaw = hasBinanceFields
    ? {
        TRC20: formData.get("binanceTrc20")?.toString().trim() ?? "",
        BEP20: formData.get("binanceBep20")?.toString().trim() ?? "",
        ERC20: formData.get("binanceErc20")?.toString().trim() ?? "",
        SOL: formData.get("binanceSol")?.toString().trim() ?? "",
      }
    : null;

  const finalSecretKey = secretKey || existing?.secretKey || "";
  const finalPin = pin || existing?.pin || "";
  const finalForwarderSecret = forwarderSecret || existing?.forwarderSecret || "";
  const finalTelegramBotToken = telegramBotToken || existing?.telegramBotToken || "";
  const finalTelegramChatId = telegramChatId || existing?.telegramChatId || "";
  const finalSiteName = siteName || existing?.siteName || "";

  if (csTelegram && !/^[A-Za-z0-9_]{4,64}$/.test(csTelegram)) {
    return { ok: false, error: "Username Telegram tidak valid (4-64 karakter: huruf, angka, underscore)" };
  }
  if (csWhatsapp && !/^62[0-9]{8,13}$/.test(csWhatsapp)) {
    return { ok: false, error: "Nomor WhatsApp harus format 62xxxxxxxxxx" };
  }

  if (!finalSecretKey && !finalPin) {
    return { ok: false, error: "Secret Key dan PIN tidak boleh kosong" };
  }

  if (finalForwarderSecret && finalForwarderSecret.length < 24) {
    return { ok: false, error: "Forwarder Secret minimal 24 karakter" };
  }

  if (!VALID_PROVIDERS.includes(qrisProvider as (typeof VALID_PROVIDERS)[number])) {
    return { ok: false, error: "Provider QRIS tidak valid" };
  }

  if (!VALID_BACKUP_UNITS.includes(backupUnit as (typeof VALID_BACKUP_UNITS)[number])) {
    return { ok: false, error: "Satuan backup tidak valid" };
  }

  if (!Number.isInteger(backupInterval) || backupInterval < 1 || backupInterval > 100000) {
    return { ok: false, error: "Interval backup tidak valid" };
  }

  if (backupEnabled && (!finalTelegramBotToken || !finalTelegramChatId)) {
    return { ok: false, error: "Bot Token dan Chat ID Telegram wajib diisi jika backup aktif" };
  }

  if (qrisProvider !== "none" && !qrisStatic) {
    return { ok: false, error: "QRIS statis wajib diisi jika provider aktif" };
  }

  if (qrisStatic && !verifyQrisCrc(qrisStatic)) {
    return { ok: false, error: "QRIS statis tidak valid (CRC gagal)" };
  }

  if (!Number.isInteger(qrisTtlMinutes) || qrisTtlMinutes < 1 || qrisTtlMinutes > 120) {
    return { ok: false, error: "Masa berlaku QRIS harus 1-120 menit" };
  }

  // Validasi Binance
  if (hasBinanceFields) {
    if (!Number.isInteger(binanceUsdtRate) || binanceUsdtRate < 1000 || binanceUsdtRate > 100000) {
      return { ok: false, error: "Kurs USDT: 1000–100000 (Rp per USDT)" };
    }
    if (binanceEnabled) {
      // kosong = pertahankan lama
      const hasKey = binanceApiKeyRaw || existing?.binanceApiKey;
      const hasSecret = binanceApiSecretRaw || existing?.binanceApiSecret;
      if (!hasKey || !hasSecret) {
        return { ok: false, error: "API Key & Secret Binance wajib diisi" };
      }
      if (binanceUid && !/^\d{6,12}$/.test(binanceUid)) {
        return { ok: false, error: "UID Binance tidak valid (digit saja)" };
      }
      if (usdtAddressesRaw) {
        const trc = usdtAddressesRaw.TRC20;
        if (trc && !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trc)) {
          return { ok: false, error: "Alamat TRC20 tidak valid (awali T, 34 char)" };
        }
        for (const [net, addr] of Object.entries(usdtAddressesRaw)) {
          if (net === "TRC20") continue;
          if (addr && addr.length < 20) return { ok: false, error: `Alamat ${net} tidak valid` };
        }
      }
      if (!binanceUid && !Object.values(usdtAddressesRaw ?? {}).some(Boolean)) {
        return { ok: false, error: "Isi minimal UID Binance Pay atau satu alamat USDT" };
      }
    }
  }
  const binanceApiKey = binanceApiKeyRaw || existing?.binanceApiKey || null;
  const binanceApiSecret = binanceApiSecretRaw || existing?.binanceApiSecret || null;
  const binanceUsdtAddresses = usdtAddressesRaw
    ? JSON.stringify(Object.fromEntries(Object.entries(usdtAddressesRaw).filter(([, v]) => v)))
    : (existing?.binanceUsdtAddresses ?? null);

  try {
    await prisma.setting.upsert({
      where: { id: 1 },
      update: {
        secretKey: finalSecretKey,
        pin: finalPin,
        qrisProvider,
        qrisStatic,
        qrisTtlMinutes,
        forwarderSecret: finalForwarderSecret,
        uniqueCodeEnabled,
        backupEnabled,
        backupInterval,
        backupUnit,
        telegramBotToken: finalTelegramBotToken,
        telegramChatId: finalTelegramChatId,
        notifyChannelId: notifyChannelId || null,
        binanceEnabled,
        binanceUid: binanceUid || null,
        binanceApiKey,
        binanceApiSecret,
        binanceUsdtAddresses,
        binanceUsdtRate,
        siteName: finalSiteName,
        csTelegram: csTelegram || null,
        csWhatsapp: csWhatsapp || null,
      },
      create: {
        id: 1,
        secretKey: finalSecretKey,
        pin: finalPin,
        qrisProvider,
        qrisStatic,
        qrisTtlMinutes,
        forwarderSecret: finalForwarderSecret,
        uniqueCodeEnabled,
        backupEnabled,
        backupInterval,
        backupUnit,
        telegramBotToken: finalTelegramBotToken,
        telegramChatId: finalTelegramChatId,
        notifyChannelId: notifyChannelId || null,
        binanceEnabled,
        binanceUid: binanceUid || null,
        binanceApiKey,
        binanceApiSecret,
        binanceUsdtAddresses,
        binanceUsdtRate,
        siteName: finalSiteName,
        csTelegram: csTelegram || null,
        csWhatsapp: csWhatsapp || null,
      },
    });
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (err) {
    console.error("saveSettings error:", err);
    return { ok: false, error: "Gagal menyimpan pengaturan" };
  }
}
