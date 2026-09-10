import { getWaSettings } from "@/app/actions/whatsapp";
import { WhatsappSettingsClient } from "@/components/whatsapp/whatsapp-settings-client";

export default async function WhatsappPage() {
  const initial = await getWaSettings();
  return <WhatsappSettingsClient initial={initial} />;
}
