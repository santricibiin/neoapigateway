import { getBotSettings } from "@/app/actions/bot";
import { BotSettingsClient } from "@/components/bot/bot-settings-client";

export default async function BotPage() {
  const initial = await getBotSettings();
  return <BotSettingsClient initial={initial} />;
}
