"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { verifyQrisCrc } from "@/lib/qris";
import type { ActionResult } from "@/types";

const VALID_PROVIDERS = ["none", "dana", "nobu"] as const;
const VALID_BACKUP_UNITS = ["minutes", "hours", "days"] as const;

export async function getSettingsRaw() {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  return {
    secretKey: setting?.secretKey ?? "",
    pin: setting?.pin ?? "",
    qrisProvider: setting?.qrisProvider ?? "none",
    qrisStatic: setting?.qrisStatic ?? "",
    qrisTtlMinutes: setting?.qrisTtlMinutes ?? 5,
    forwarderSecret: setting?.forwarderSecret ?? "",
    uniqueCodeEnabled: setting?.uniqueCodeEnabled ?? true,
    backupEnabled: setting?.backupEnabled ?? false,
    backupInterval: setting?.backupInterval ?? 1440,
    backupUnit: setting?.backupUnit ?? "minutes",
    telegramBotToken: setting?.telegramBotToken ?? "",
    telegramChatId: setting?.telegramChatId ?? "",
    siteName: setting?.siteName ?? "",
    logoPath: setting?.logoPath ?? "",
  };
}

export async function getSettings() {
  requireAdmin();
  return getSettingsRaw();
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
  const backupEnabled = formData.get("backupEnabled") === "on";
  const backupInterval = Number(formData.get("backupInterval") ?? "1440");
  const backupUnit = formData.get("backupUnit")?.toString().trim() ?? "minutes";
  const telegramBotToken = formData.get("telegramBotToken")?.toString().trim() ?? "";
  const telegramChatId = formData.get("telegramChatId")?.toString().trim() ?? "";
  const siteName = formData.get("siteName")?.toString().trim() ?? "";

  // Preserve existing values jika field kosong (memungkinkan update section lain tanpa re-input)
  const existing = await prisma.setting.findUnique({ where: { id: 1 } });
  const finalSecretKey = secretKey || existing?.secretKey || "";
  const finalPin = pin || existing?.pin || "";
  const finalForwarderSecret = forwarderSecret || existing?.forwarderSecret || "";
  const finalTelegramBotToken = telegramBotToken || existing?.telegramBotToken || "";
  const finalTelegramChatId = telegramChatId || existing?.telegramChatId || "";
  const finalSiteName = siteName || existing?.siteName || "";

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
        siteName: finalSiteName,
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
        siteName: finalSiteName,
      },
    });
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (err) {
    console.error("saveSettings error:", err);
    return { ok: false, error: "Gagal menyimpan pengaturan" };
  }
}
