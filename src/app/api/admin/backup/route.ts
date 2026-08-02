import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runBackup, findSqlBackups, getBackupSettings, backupIntervalMs } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getBackupSettings();
  const sqlFiles = findSqlBackups();
  const intervalMs = backupIntervalMs(settings.backupInterval, settings.backupUnit);

  return NextResponse.json({
    ok: true,
    settings: {
      enabled: settings.backupEnabled,
      interval: settings.backupInterval,
      unit: settings.backupUnit,
      intervalMs,
      hasTelegram: Boolean(settings.telegramBotToken && settings.telegramChatId),
    },
    sqlFiles,
  });
}

export async function POST() {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await runBackup();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
