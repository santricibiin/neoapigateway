import { bandelUpstreamBase, publicApiBase } from "@/lib/bandel-upstream";

const BASE_URL = bandelUpstreamBase();

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
    by_model?: Record<string, {
      total_tokens?: number;
      prompt_tokens?: number;
      completion_tokens?: number;
      requests?: number;
    }>;
    [k: string]: unknown;
  };
  expiresAt?: string | null;
  createdAt?: string;
  tag?: string | null;
  pinSet?: boolean;
  secretToken?: string | null;
  dashboardUrl?: string | null;
  publicDashboardUrl?: string | null;
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

export const QUOTA_PACKAGES = {
  "1M": { tokens: 1_000_000, validDays: 7 },
  "5M": { tokens: 5_000_000, validDays: 7 },
  "10M": { tokens: 10_000_000, validDays: 7 },
  "20M": { tokens: 20_000_000, validDays: 7 },
  "50M": { tokens: 50_000_000, validDays: 14 },
  "100M": { tokens: 100_000_000, validDays: 14 },
  "200M": { tokens: 200_000_000, validDays: 21 },
  "500M": { tokens: 500_000_000, validDays: 28 },
  "1B": { tokens: 1_000_000_000, validDays: 28 },
  "2B": { tokens: 2_000_000_000, validDays: 28 },
  "3B": { tokens: 3_000_000_000, validDays: 28 },
  "4B": { tokens: 4_000_000_000, validDays: 28 },
  "5B": { tokens: 5_000_000_000, validDays: 28 },
  "10B": { tokens: 10_000_000_000, validDays: 28 },
} as const;

export async function addCustomerQuota(
  secretKey: string,
  targetKeyId: number,
  addTokens: number,
  validDays: number
) {
  const res = await fetch(`${BASE_URL}/api/public/reseller/add-quota`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ secretToken: secretKey, targetKeyId, addTokens, validDays }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Tambah kuota gagal (${res.status})`);
  return data as { success?: boolean; remainingQuota?: number; key?: ResellerKey };
}

export interface QuotaMeta {
  id?: string | number;
  name?: string;
  status?: string;
  pinSet?: boolean;
  pinLockedUntil?: string | null;
  resellerPhone?: string | null;
  createdAt?: string | null;
}

export interface PinVerification {
  accessToken: string;
  expiresIn?: number;
}

export async function verifyPin(secretKey: string, pin: string): Promise<PinVerification> {
  const res = await fetch(
    `${BASE_URL}/api/public/quota/${encodeURIComponent(secretKey)}/verify-pin`,
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
  return data as PinVerification;
}

export async function fetchQuotaMeta(secretKey: string): Promise<QuotaMeta> {
  const res = await fetch(`${BASE_URL}/api/public/quota/${encodeURIComponent(secretKey)}`, {
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gagal mengambil data dashboard");
  return data as QuotaMeta;
}

export async function fetchQuotaData(secretKey: string, accessToken: string): Promise<ResellerData> {
  const res = await fetch(`${BASE_URL}/api/public/quota/${encodeURIComponent(secretKey)}/data`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Gagal mengambil data dashboard");
  return data as ResellerData;
}

export async function fetchResellerData(
  secretKey: string,
  pin: string
): Promise<ResellerData> {
  const { accessToken } = await verifyPin(secretKey, pin);
  return fetchQuotaData(secretKey, accessToken);
}

export async function fetchCustomerActivity(
  secretKey: string,
  pin: string,
  type?: string
): Promise<ResellerActivity[]> {
  const { accessToken } = await verifyPin(secretKey, pin);
  const url = new URL(`${BASE_URL}/api/public/quota/${secretKey}/activity`);
  if (type) url.searchParams.set("type", type);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Gagal mengambil history penggunaan");
  }
  return (data.logs || []) as ResellerActivity[];
}

export async function fetchResellerKeys(
  secretKey: string
): Promise<{ keys: ResellerKey[]; resellerApiKey?: string; resellerQuota?: number }> {
  const url = new URL(`${BASE_URL}/api/public/reseller/keys`);
  url.searchParams.set("token", secretKey);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Gagal mengambil daftar key");
  }
  return data as { keys: ResellerKey[]; resellerApiKey?: string; resellerQuota?: number };
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

export const BANDEL_DEFAULT_MEMBER_PIN = "111111";

export type BandelCreatedKey = {
  success?: boolean;
  remainingQuota?: number;
  dashboardUrl?: string;
  secretToken?: string;
  name?: string;
  id?: number;
  maxTokens?: number;
  validDays?: number;
  keyMasked?: string;
  apiKey?: string;
  pin?: string;
  error?: string;
  raw?: unknown;
};

function parseCreateKeyResponse(json: unknown): BandelCreatedKey {
  const j = (json || {}) as Record<string, unknown>;
  const nested = j.key && typeof j.key === "object" ? (j.key as Record<string, unknown>) : null;
  const dashboardUrl =
    (typeof j.dashboardUrl === "string" && j.dashboardUrl) ||
    (typeof nested?.dashboardUrl === "string" && nested.dashboardUrl) ||
    undefined;
  let secret =
    (typeof j.secretToken === "string" && j.secretToken) ||
    (typeof nested?.secretToken === "string" && nested.secretToken) ||
    undefined;
  if (!secret && dashboardUrl) {
    const m = dashboardUrl.match(/\/public\/quota\/([a-fA-F0-9]{16,})(?:[/?#]|$)/);
    if (m?.[1]) secret = m[1];
  }
  const apiKey =
    (typeof j.key === "string" && j.key.startsWith("sk-") && j.key) ||
    (typeof nested?.key === "string" && String(nested.key).startsWith("sk-") && String(nested.key)) ||
    (typeof j.apiKey === "string" && j.apiKey) ||
    undefined;
  return {
    success: j.success !== false,
    remainingQuota: typeof j.remainingQuota === "number" ? j.remainingQuota : undefined,
    dashboardUrl,
    secretToken: secret,
    name: (nested?.name as string) || (j.name as string) || undefined,
    id: (nested?.id as number) || (j.id as number) || undefined,
    maxTokens: (nested?.maxTokens as number) || (j.maxTokens as number) || undefined,
    validDays: (nested?.validDays as number) || (j.validDays as number) || undefined,
    keyMasked: (nested?.keyMasked as string) || (j.keyMasked as string) || undefined,
    apiKey: apiKey || undefined,
    error: typeof j.error === "string" ? j.error : undefined,
    raw: json,
  };
}

export async function createCustomerKey(
  secretKey: string,
  maxTokens: number,
  validDays: number
): Promise<BandelCreatedKey> {
  const res = await fetch(`${BASE_URL}/api/public/reseller/create-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ secretToken: secretKey, maxTokens, validDays }),
    cache: "no-store",
  });
  const json = await res.json();
  const parsed = parseCreateKeyResponse(json);
  if (!res.ok || parsed.error) {
    throw new Error(parsed.error || `Create key gagal (${res.status})`);
  }
  if (!parsed.dashboardUrl && !parsed.secretToken) {
    throw new Error("Create key OK tapi dashboardUrl kosong");
  }
  return parsed;
}

export async function setupCustomerPin(
  customerSecretToken: string,
  pin: string = BANDEL_DEFAULT_MEMBER_PIN
): Promise<{ accessToken: string; expiresIn?: number }> {
  const res = await fetch(
    `${BASE_URL}/api/public/quota/${encodeURIComponent(customerSecretToken)}/setup-pin`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ pin, confirmPin: pin }),
      cache: "no-store",
    }
  );
  const data = await res.json();
  if (!res.ok || !data?.accessToken) {
    if (res.status === 400 || res.status === 409 || res.status === 422) {
      return verifyPin(customerSecretToken, pin);
    }
    throw new Error(data.error || `Setup PIN gagal (${res.status})`);
  }
  return { accessToken: data.accessToken, expiresIn: data.expiresIn };
}

export async function provisionCustomerKey(
  resellerSecretKey: string,
  maxTokens: number,
  validDays: number,
  pin: string = BANDEL_DEFAULT_MEMBER_PIN
): Promise<BandelCreatedKey> {
  const created = await createCustomerKey(resellerSecretKey, maxTokens, validDays);
  const customerToken = created.secretToken;
  if (!customerToken) {
    throw new Error("create-key tanpa secretToken customer");
  }

  let apiKey = created.apiKey;
  try {
    const { accessToken } = await setupCustomerPin(customerToken, pin);
    const data = await fetchQuotaData(customerToken, accessToken);
    if (typeof data.key === "string" && data.key.startsWith("sk-")) {
      apiKey = data.key;
    }
    if (!created.name && typeof data.name === "string") {
      created.name = data.name;
    }
    if (!created.keyMasked && typeof data.keyMasked === "string") {
      created.keyMasked = data.keyMasked;
    }
  } catch (e) {
    console.error("[bandel] setup-pin/data setelah create-key:", e instanceof Error ? e.message : e);
  }

  return { ...created, secretToken: customerToken, apiKey, pin };
}

export function formatBandelDelivery(result: BandelCreatedKey, code: string) {
  const pub = publicApiBase();
  const secret = result.secretToken;
  const url = secret ? `${pub}/quota/${secret}` : result.dashboardUrl || "";
  if (!url) throw new Error("dashboardUrl kosong");
  const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
  const apiBase = `${pub}/v1`;
  const pin = result.pin || BANDEL_DEFAULT_MEMBER_PIN;
  const lines = [
    `Paket: ${code}`,
    pack ? `Token: ${pack.tokens.toLocaleString("id-ID")} · ${pack.validDays} hari` : null,
    result.name ? `Nama: ${result.name}` : null,
    `Dashboard: ${url}`,
    `PIN: ${pin}`,
    result.apiKey ? `API Key: ${result.apiKey}` : result.keyMasked ? `API Key: ${result.keyMasked}` : null,
    `API Base: ${apiBase}`,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}
