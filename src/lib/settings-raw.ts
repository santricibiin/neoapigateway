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
    siteName: setting?.siteName ?? "",
    logoPath: setting?.logoPath ?? "",
  };
}
