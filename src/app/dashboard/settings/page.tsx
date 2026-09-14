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
      initialSiteName={settings.siteName}
      initialCsTelegram={settings.csTelegram}
      initialCsWhatsapp={settings.csWhatsapp}
      initialBinance={{
        enabled: settings.binanceEnabled,
        uid: settings.binanceUid,
        rate: settings.binanceUsdtRate,
        addresses: (() => {
          try {
            return JSON.parse(settings.binanceUsdtAddresses || "{}");
          } catch {
            return {};
          }
        })(),
      }}
      initialGopay2={{
        baseUrl: settings.gopay2BaseUrl,
        apiKey: settings.gopay2ApiKey,
        qrisStatic: settings.gopay2QrisStatic,
      }}
      hasLogo={Boolean(settings.logoPath)}
      initialMaintenance={{ enabled: settings.maintenanceEnabled, text: settings.maintenanceText }}
    />
  );
}
