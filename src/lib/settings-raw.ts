import { prisma } from "@/lib/prisma";

/** Baca setting lengkap (termasuk secrets). Hanya untuk server-side code — JANGAN export dari file "use server". */
export async function readSettingsRaw() {
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
    notifyChannelId: setting?.notifyChannelId ?? "",
    siteName: setting?.siteName ?? "",
    logoPath: setting?.logoPath ?? "",
    csTelegram: setting?.csTelegram ?? "",
    csWhatsapp: setting?.csWhatsapp ?? "",
    binanceEnabled: setting?.binanceEnabled ?? false,
    binanceUid: setting?.binanceUid ?? "",
    binanceUsdtAddresses: setting?.binanceUsdtAddresses ?? "{}",
    binanceUsdtRate: setting?.binanceUsdtRate ?? 16000,
    gopay2BaseUrl: setting?.gopay2BaseUrl ?? "",
    gopay2ApiKey: setting?.gopay2ApiKey ?? "",
    gopay2QrisStatic: setting?.gopay2QrisStatic ?? "",
    maintenanceEnabled: setting?.maintenanceEnabled ?? false,
    maintenanceText: setting?.maintenanceText ?? "",
  };
}
