import { getSettings } from "@/app/actions/settings";
import { CustomerKeysClient } from "@/components/customer-keys/customer-keys-client";
import { fetchResellerKeys } from "@/lib/bandelbanget";

export default async function CustomerKeysPage() {
  const settings = await getSettings();

  if (!settings.secretKey) {
    return (
      <CustomerKeysClient
        initialKeys={[]}
        error="Secret Key belum diatur. Silakan lengkapi melalui menu Pengaturan."
      />
    );
  }

  try {
    const result = await fetchResellerKeys(settings.secretKey);
    return <CustomerKeysClient initialKeys={result.keys} error={null} />;
  } catch (error) {
    return (
      <CustomerKeysClient
        initialKeys={[]}
        error={error instanceof Error ? error.message : "Gagal mengambil Customer Keys"}
      />
    );
  }
}