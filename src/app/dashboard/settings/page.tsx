import { getSettings } from "@/app/actions/settings";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <SettingsClient
      initialSecretKey={settings.secretKey}
      initialPin={settings.pin}
      initialQrisProvider={settings.qrisProvider}
      initialQrisStatic={settings.qrisStatic}
      initialQrisTtlMinutes={settings.qrisTtlMinutes}
      initialForwarderSecret={settings.forwarderSecret}
      initialUniqueCodeEnabled={settings.uniqueCodeEnabled}
      initialBackupEnabled={settings.backupEnabled}
      initialBackupInterval={settings.backupInterval}
      initialBackupUnit={settings.backupUnit}
      initialTelegramBotToken={settings.telegramBotToken}
      initialTelegramChatId={settings.telegramChatId}
      initialSiteName={settings.siteName}
      hasLogo={Boolean(settings.logoPath)}
    />
  );
}
