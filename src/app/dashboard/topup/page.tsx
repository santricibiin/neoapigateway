import { getSettings } from "@/app/actions/settings";
import { TopupClient } from "@/components/topup/topup-client";
import { fetchTopupHistory, fetchTopupTiers } from "@/lib/bandelbanget";

export default async function TopupPage() {
  const settings = await getSettings();
  if (!settings.secretKey) return <TopupClient tiers={[]} initialTransactions={[]} error="Secret Key belum diatur." />;

  try {
    const [pricing, transactions] = await Promise.all([
      fetchTopupTiers(),
      fetchTopupHistory(settings.secretKey),
    ]);
    return <TopupClient tiers={pricing.tiers} initialTransactions={transactions} error={null} />;
  } catch (error) {
    return <TopupClient tiers={[]} initialTransactions={[]} error={error instanceof Error ? error.message : "Gagal memuat topup"} />;
  }
}