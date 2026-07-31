import { getSettings } from "@/app/actions/settings";
import {
  fetchResellerData,
  fetchResellerKeys,
  fetchResellerActivity,
} from "@/lib/bandelbanget";
import { ResellerClient } from "@/components/reseller/reseller-client";

export default async function ResellerPage() {
  const settings = await getSettings();

  if (!settings.secretKey || !settings.pin) {
    return (
      <ResellerClient
        data={null}
        keys={[]}
        activity={[]}
        error="Secret Key dan PIN belum diatur. Silakan atur di menu Pengaturan."
      />
    );
  }

  let data = null;
  let keys: Awaited<ReturnType<typeof fetchResellerKeys>>["keys"] = [];
  let activity: Awaited<ReturnType<typeof fetchResellerActivity>> = [];
  let error: string | null = null;

  try {
    data = await fetchResellerData(settings.secretKey, settings.pin);
  } catch (err) {
    error = err instanceof Error ? err.message : "Gagal mengambil data reseller";
  }

  try {
    const keysRes = await fetchResellerKeys(settings.secretKey);
    keys = keysRes.keys;
  } catch {
    // non-critical
  }

  try {
    activity = await fetchResellerActivity(settings.secretKey);
  } catch {
    // non-critical
  }

  return (
    <ResellerClient
      data={data}
      keys={keys}
      activity={activity}
      error={error}
    />
  );
}
