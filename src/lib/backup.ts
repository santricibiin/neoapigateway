import { execSync } from "child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync, statSync } from "fs";
import { gzipSync } from "zlib";
import { join } from "path";
import { prisma } from "@/lib/prisma";

interface BackupSettings {
  backupEnabled: boolean;
  backupInterval: number;
  backupUnit: string;
  telegramBotToken: string;
  telegramChatId: string;
}

export async function getBackupSettings(): Promise<BackupSettings> {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  return {
    backupEnabled: setting?.backupEnabled ?? false,
    backupInterval: setting?.backupInterval ?? 1440,
    backupUnit: setting?.backupUnit ?? "minutes",
    telegramBotToken: setting?.telegramBotToken ?? "",
    telegramChatId: setting?.telegramChatId ?? "",
  };
}

function parseDatabaseUrl(url: string) {
  const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/);
  if (!match) throw new Error("DATABASE_URL tidak valid");
  return { user: match[1], password: match[2], host: match[3], port: match[4], db: match[5] };
}

function wibTimestamp(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(wib.getUTCDate()).padStart(2, "0");
  const mm = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(wib.getUTCFullYear()).slice(2);
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const min = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${dd}${mm}${yy}-${hh}${min}`;
}

export async function runBackup(): Promise<{ ok: boolean; file?: string; error?: string; sent?: boolean }> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return { ok: false, error: "DATABASE_URL tidak ditemukan" };

  const settings = await getBackupSettings();
  if (!settings.telegramBotToken || !settings.telegramChatId) {
    return { ok: false, error: "Telegram Bot Token / Chat ID belum diatur" };
  }

  const db = parseDatabaseUrl(dbUrl);
  const ts = wibTimestamp();
  const sqlPath = join("/tmp", `bc-${ts}.sql`);
  const gzPath = join("/tmp", `bc-${ts}.sql.gz`);

  // mysqldump
  try {
    execSync(
      `mysqldump -h ${db.host} -P ${db.port} -u ${db.user} -p'${db.password}' ${db.db} --single-transaction --routines --triggers > "${sqlPath}"`,
      { stdio: "pipe", timeout: 60000 }
    );
  } catch (e) {
    return { ok: false, error: `mysqldump gagal: ${e instanceof Error ? e.message : e}` };
  }

  // gzip pakai Node native (tidak butuh command zip)
  try {
    const sqlData = readFileSync(sqlPath);
    if (!sqlData.length) throw new Error("SQL dump kosong");
    const gzData = gzipSync(sqlData);
    writeFileSync(gzPath, gzData);
  } catch (e) {
    return { ok: false, error: `compress gagal: ${e instanceof Error ? e.message : e}` };
  }

  unlinkSync(sqlPath);

  const gzName = `bc-${ts}.sql.gz`;
  const sent = await sendToTelegram(gzPath, gzName, settings.telegramBotToken, settings.telegramChatId);

  unlinkSync(gzPath);

  return { ok: true, file: gzName, sent };
}

async function sendToTelegram(filePath: string, fileName: string, botToken: string, chatId: string): Promise<boolean> {
  try {
    const formData = new FormData();
    const fileBuffer = readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: "application/gzip" });
    formData.append("chat_id", chatId);
    formData.append("document", blob, fileName);
    formData.append("caption", `Backup database ${fileName}`);

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export function findSqlBackups(dir: string = "/root/neoapigateway"): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql") || f.endsWith(".zip") || f.endsWith(".gz"))
    .map((f) => {
      const fullPath = join(dir, f);
      const stat = statSync(fullPath);
      return { name: f, path: fullPath, size: stat.size, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    .map((item) => `${item.name}|${item.size}|${item.mtime.toISOString()}`);
}

export function backupIntervalMs(interval: number, unit: string): number {
  const multipliers: Record<string, number> = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };
  return interval * (multipliers[unit] || 60 * 1000);
}
