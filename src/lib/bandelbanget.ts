const BASE_URL = "https://bandelbanget.xyz";

export interface ResellerData {
  id?: string;
  name?: string;
  key?: string;
  balance?: number;
  usage?: {
    total_tokens?: number;
    [k: string]: unknown;
  };
  resellerId?: string;
  resellerQuota?: number;
  resellerBalance?: number;
  resellerPhone?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  resellerExpiresAt?: string | null;
  [k: string]: unknown;
}

export interface ResellerKey {
  id: string | number;
  name?: string;
  key?: string;
  keyMasked?: string;
  status?: "active" | "exceeded" | "expired" | string;
  maxTokens?: number;
  validDays?: number;
  balance?: number;
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    requests?: number;
    [k: string]: unknown;
  };
  expiresAt?: string | null;
  createdAt?: string;
  tag?: string | null;
  pinSet?: boolean;
  [k: string]: unknown;
}

export interface ResellerActivity {
  id?: string | number;
  type?: string;
  description?: string;
  message?: string;
  note?: string;
  name?: string;
  targetName?: string;
  target_key_id?: number | null;
  target_key_name?: string | null;
  key_id?: number;
  key_name?: string;
  amount?: number;
  tokens?: number;
  token_amount?: number | null;
  balance_after?: number | null;
  detail?: string;
  createdAt?: string;
  timestamp?: string | number;
  [k: string]: unknown;
}

export interface TopupTier {
  id: string;
  tokens: number;
  label: string;
  validDays: number;
  description?: string;
  badge?: string;
  resellerEnabled: boolean;
  resellerPrice: number;
  flashSaleDiscount?: number;
  flashSalePrice?: number;
  sortOrder?: number;
}

export interface TopupTransaction {
  id: number;
  orderId: string;
  tierId: string;
  tokens: number;
  amount: number;
  uniqueAmount?: number;
  grossAmount?: number;
  status: string;
  midtransStatus?: string;
  credited?: boolean;
  paymentType?: string;
  failureReason?: string | null;
  expiresAt?: number;
  paidAt?: number | null;
  createdAt: number;
  updatedAt?: number;
}

export interface CreatedTopup {
  success: boolean;
  orderId: string;
  snapToken?: string;
  clientKey?: string;
  isProduction?: boolean;
  redirectUrl?: string;
  expiryAt?: number;
}

async function verifyPin(secretKey: string, pin: string): Promise<string> {
  const res = await fetch(
    `${BASE_URL}/api/public/quota/${secretKey}/verify-pin`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    }
  );
  const data = await res.json();
  if (!res.ok || !data.accessToken) {
    throw new Error(data.error || "Gagal verifikasi PIN");
  }
  return data.accessToken as string;
}

export async function fetchResellerData(
  secretKey: string,
  pin: string
): Promise<ResellerData> {
  const accessToken = await verifyPin(secretKey, pin);
  const res = await fetch(`${BASE_URL}/api/public/quota/${secretKey}/data`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Gagal mengambil data reseller");
  }
  return data as ResellerData;
}

export async function fetchCustomerActivity(
  secretKey: string,
  pin: string,
  type?: string
): Promise<ResellerActivity[]> {
  const accessToken = await verifyPin(secretKey, pin);
  const url = new URL(`${BASE_URL}/api/public/quota/${secretKey}/activity`);
  if (type) url.searchParams.set("type", type);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Gagal mengambil history penggunaan");
  }
  return (data.logs || []) as ResellerActivity[];
}

export async function fetchResellerKeys(
  secretKey: string
): Promise<{ keys: ResellerKey[]; resellerApiKey?: string }> {
  const res = await fetch(
    `${BASE_URL}/api/public/reseller/keys?token=${secretKey}`
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Gagal mengambil daftar key");
  }
  return data as { keys: ResellerKey[]; resellerApiKey?: string };
}

export async function fetchResellerActivity(
  secretKey: string,
  type?: string
): Promise<ResellerActivity[]> {
  const url = new URL(`${BASE_URL}/api/public/reseller/activity`);
  url.searchParams.set("token", secretKey);
  if (type) url.searchParams.set("type", type);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Gagal mengambil aktivitas");
  }
  return (data.logs || []) as ResellerActivity[];
}

export async function fetchTopupTiers(): Promise<{ tiers: TopupTier[]; flashSaleEnabled: boolean }> {
  const res = await fetch(`${BASE_URL}/api/pricing`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gagal mengambil paket topup");
  return {
    flashSaleEnabled: Boolean(data.flashSaleEnabled),
    tiers: ((data.tiers || []) as TopupTier[])
      .filter((tier) => tier.resellerEnabled)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  };
}

export async function fetchTopupHistory(secretKey: string): Promise<TopupTransaction[]> {
  const url = new URL(`${BASE_URL}/api/public/reseller/topup`);
  url.searchParams.set("token", secretKey);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.error || "Gagal mengambil riwayat topup");
  return (data.transactions || []) as TopupTransaction[];
}

export async function createTopup(secretKey: string, tierId: string): Promise<CreatedTopup> {
  const res = await fetch(`${BASE_URL}/api/public/reseller/topup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secretToken: secretKey, tierId }),
  });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.error || "Gagal membuat pembayaran topup");
  return data as CreatedTopup;
}

export async function fetchTopupStatus(secretKey: string, orderId: string): Promise<Record<string, unknown>> {
  const url = new URL(`${BASE_URL}/api/public/reseller/topup/status`);
  url.searchParams.set("token", secretKey);
  url.searchParams.set("orderId", orderId);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.error || "Gagal mengecek status topup");
  return data as Record<string, unknown>;
}
