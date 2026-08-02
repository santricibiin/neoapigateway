import { requireAdmin } from "@/lib/auth";
import { getBackupSettings } from "@/lib/backup";
import { BackupClient } from "@/components/backup/backup-client";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  requireAdmin();
  const settings = await getBackupSettings();

  return (
    <BackupClient
      initialEnabled={settings.backupEnabled}
      initialInterval={settings.backupInterval}
      initialUnit={settings.backupUnit}
      initialBotToken={settings.telegramBotToken}
      initialChatId={settings.telegramChatId}
    />
  );
}
