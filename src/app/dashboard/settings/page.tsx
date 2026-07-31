import { getSettings } from "@/app/actions/settings";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <SettingsClient
      initialSecretKey={settings.secretKey}
      initialPin={settings.pin}
    />
  );
}
