import { bandelUpstreamBase, publicApiBase } from "@/lib/bandel-upstream";
import { prisma } from "@/lib/prisma";

const BASE_URL = bandelUpstreamBase();

/**
 * Fetch helper: parse JSON, lempar Error dengan property `status` (HTTP code)
 * dan `code` (error code body upstream) supaya retry 401 di withBandelAuth
 * bisa mendeteksi token expire / password_setup_required.
 */
async function bandelFetch(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, { cache: "no-store", ...init });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    const message =
      (typeof data.error === "string" && data.error) ||
      (typeof data.message === "string" && data.message) ||
      `Provider error (${res.status})`;
    throw Object.assign(new Error(message), {
      status: res.status,
      code: typeof data.code === "string" ? data.code : undefined,
    });
  }
  return data;
}

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
  validDays: number,
  pin?: string
) {
  return withBandelAuth(secretKey, pin, async (accessToken) => {
    const data = await bandelFetch(`${BASE_URL}/api/public/reseller/add-quota`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...bearerHeaders(accessToken) },
      body: JSON.stringify({ secretToken: secretKey, targetKeyId, addTokens, validDays }),
    });
    return data as unknown as { success?: boolean; remainingQuota?: number; key?: ResellerKey };
  });
}

export interface QuotaMeta {
  id?: string | number;
  name?: string;
  status?: string;
  pinSet?: boolean;
  passwordSet?: boolean;
  credentialsSet?: boolean;
  requiresCurrentPin?: boolean;
  pinLockedUntil?: string | null;
  resellerPhone?: string | null;
  createdAt?: string | null;
}

export interface PinVerification {
  accessToken: string;
  expiresIn?: number;
}

export async function verifyPin(secretKey: string, pin: string, password?: string): Promise<PinVerification> {
  const data = await bandelFetch(
    `${BASE_URL}/api/public/quota/${encodeURIComponent(secretKey)}/verify-pin`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Upstream wajib password + PIN. Password wajib eksplisit (admin dari
      // Setting.bandelPassword; member dari input dashboard gateway).
      body: JSON.stringify({ password, pin }),
    }
  );
  if (typeof data.accessToken !== "string" || !data.accessToken) {
    throw new Error("Gagal verifikasi PIN: accessToken kosong");
  }
  return data as unknown as PinVerification;
}

// ===== Bearer auth untuk endpoint /api/public/reseller/* =====
// Upstream kini mewajibkan Authorization: Bearer <accessToken> (hasil verify-pin,
// expire 2 jam). Token di-cache in-memory 90 menit (< 2 jam supaya token expired
// tak pernah terpakai) + auto force-refresh & retry 1x saat 401.

const BANDEL_TOKEN_TTL_MS = 90 * 60 * 1000;
const bandelTokenCache = new Map<string, { token: string; expiresAt: number }>();

/** PIN reseller: param eksplisit → env BB_PIN → kolom Setting.pin di DB. */
async function resolveResellerPin(pin?: string): Promise<string | undefined> {
  if (pin) return pin;
  const envPin = process.env.BB_PIN?.trim();
  if (envPin) return envPin;
  const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { pin: true } });
  return setting?.pin || undefined;
}

/** Password reseller admin: param eksplisit → env BB_PASSWORD → Setting.bandelPassword di DB. */
async function resolveResellerPassword(password?: string): Promise<string | undefined> {
  if (password) return password;
  const envPw = process.env.BB_PASSWORD?.trim();
  if (envPw) return envPw;
  const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { bandelPassword: true } });
  return setting?.bandelPassword || undefined;
}

/** Ambil accessToken reseller (verify-pin + cache TTL 90 menit). */
export async function bandelAccessToken(
  secretKey: string,
  pin?: string,
  forceRefresh = false
): Promise<string> {
  const cached = bandelTokenCache.get(secretKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.token;
  const resolvedPin = await resolveResellerPin(pin);
  if (!resolvedPin) {
    if (cached?.token) return cached.token;
    throw new Error("PIN reseller belum diatur (isi PIN di menu Pengaturan atau env BB_PIN)");
  }
  const resolvedPassword = await resolveResellerPassword();
  if (!resolvedPassword) {
    if (cached?.token) return cached.token;
    throw new Error("Password bandel belum diatur (isi Password di menu Pengaturan atau env BB_PASSWORD)");
  }
  const { accessToken, expiresIn } = await verifyPin(secretKey, resolvedPin, resolvedPassword);
  const ttl = Math.max(60_000, Math.min(BANDEL_TOKEN_TTL_MS, (expiresIn ?? BANDEL_TOKEN_TTL_MS)));
  bandelTokenCache.set(secretKey, { token: accessToken, expiresAt: Date.now() + ttl });
  return accessToken;
}

/** Hapus accessToken reseller dari cache. */
export function bandelClearAccessToken(secretKey: string) {
  bandelTokenCache.delete(secretKey);
}

function isBandelAuthError(e: unknown): boolean {
  const status = (e as { status?: number } | null)?.status;
  const msg = e instanceof Error ? e.message : String(e);
  return status === 401 || /pin_required|PIN verification/i.test(msg);
}

/**
 * Jalankan call dengan Bearer accessToken; kalau 401 / pin_required,
 * force-refresh token lalu retry 1x. Semua endpoint reseller dibungkus ini.
 */
async function withBandelAuth<T>(
  secretKey: string,
  pin: string | undefined,
  call: (accessToken: string) => Promise<T>
): Promise<T> {
  const accessToken = await bandelAccessToken(secretKey, pin);
  try {
    return await call(accessToken);
  } catch (e) {
    if (isBandelAuthError(e)) {
      bandelTokenCache.delete(secretKey);
      const fresh = await bandelAccessToken(secretKey, pin, true);
      return call(fresh);
    }
    throw e;
  }
}

function bearerHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function fetchQuotaMeta(secretKey: string): Promise<QuotaMeta> {
  const data = await bandelFetch(`${BASE_URL}/api/public/quota/${encodeURIComponent(secretKey)}`);
  return data as unknown as QuotaMeta;
}

export async function fetchQuotaData(secretKey: string, accessToken: string): Promise<ResellerData> {
  const data = await bandelFetch(`${BASE_URL}/api/public/quota/${encodeURIComponent(secretKey)}/data`, {
    headers: bearerHeaders(accessToken),
  });
  return data as unknown as ResellerData;
}

export async function fetchResellerData(
  secretKey: string,
  pin: string
): Promise<ResellerData> {
  // Pakai bandelAccessToken supaya verify-pin cukup sekali per 90 menit (cache).
  const accessToken = await bandelAccessToken(secretKey, pin);
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
  const data = await bandelFetch(url.toString(), { headers: bearerHeaders(accessToken) });
  return (data.logs || []) as ResellerActivity[];
}

/** Ganti PIN member (butuh accessToken hasil verify-pin). Body upstream: oldPin/newPin/confirmNewPin. */
export async function changeQuotaPin(
  secretKey: string,
  accessToken: string,
  oldPin: string,
  newPin: string
): Promise<Record<string, unknown>> {
  return bandelFetch(`${BASE_URL}/api/public/quota/${encodeURIComponent(secretKey)}/change-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearerHeaders(accessToken) },
    body: JSON.stringify({ oldPin, newPin, confirmNewPin: newPin }),
  });
}

/** Rotasi API key member (butuh accessToken; upstream cooldown 60 menit → 429). */
export async function regenerateQuotaKey(
  secretKey: string,
  accessToken: string
): Promise<{ success?: boolean; keyMasked?: string; keyRegeneratedAt?: string; cooldownAt?: string }> {
  return bandelFetch(`${BASE_URL}/api/public/quota/${encodeURIComponent(secretKey)}/regenerate-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearerHeaders(accessToken) },
    body: JSON.stringify({}),
  }) as Promise<{ success?: boolean; keyMasked?: string; keyRegeneratedAt?: string; cooldownAt?: string }>;
}

async function fetchResellerKeysPage(
  secretKey: string,
  page: number,
  pin?: string
): Promise<{ keys: ResellerKey[]; resellerApiKey?: string; resellerQuota?: number }> {
  return withBandelAuth(secretKey, pin, async (accessToken) => {
    const url = new URL(`${BASE_URL}/api/public/reseller/keys`);
    url.searchParams.set("token", secretKey);
    if (page > 1) url.searchParams.set("page", String(page));
    const data = await bandelFetch(url.toString(), { headers: bearerHeaders(accessToken) });
    return data as unknown as { keys: ResellerKey[]; resellerApiKey?: string; resellerQuota?: number };
  });
}

/**
 * Ambil SEMUA key reseller. Upstream membatasi 10 key per halaman (param
 * page), jadi loop halaman 1..N (paralel per batch) sampai respons
 * kembali < 10 key atau kosong, lalu gabungkan + dedup by id.
 */
export async function fetchResellerKeys(
  secretKey: string,
  pin?: string
): Promise<{ keys: ResellerKey[]; resellerApiKey?: string; resellerQuota?: number }> {
  const PAGE_SIZE = 10;
  const BATCH = 8;

  const first = await fetchResellerKeysPage(secretKey, 1, pin);
  const firstKeys = Array.isArray(first.keys) ? first.keys : [];
  if (firstKeys.length < PAGE_SIZE) return first;

  const all = [...firstKeys];
  let next = 2;
  let done = false;

  while (!done) {
    const pages = Array.from({ length: BATCH }, (_, i) => next + i);
    const results = await Promise.all(
      pages.map((p) => fetchResellerKeysPage(secretKey, p, pin).catch(() => null))
    );
    for (const r of results) {
      if (!r) {
        done = true;
        break;
      }
      const keys = Array.isArray(r.keys) ? r.keys : [];
      if (keys.length === 0) {
        done = true;
        break;
      }
      for (const k of keys) all.push(k);
      if (keys.length < PAGE_SIZE) {
        done = true;
        break;
      }
    }
    next += BATCH;
    if (next > 1000) done = true; // safety: maks 1000 halaman (= 10.000 key)
  }

  // Dedup by id — halaman bisa bergeser antar request.
  const seen = new Set<string | number>();
  const deduped = all.filter((k) => {
    const id = (k as { id?: unknown })?.id;
    const key = typeof id === "number" || typeof id === "string" ? id : null;
    if (key === null || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { ...first, keys: deduped };
}

export async function fetchResellerActivity(
  secretKey: string,
  type?: string,
  pin?: string
): Promise<ResellerActivity[]> {
  return withBandelAuth(secretKey, pin, async (accessToken) => {
    const url = new URL(`${BASE_URL}/api/public/reseller/activity`);
    url.searchParams.set("token", secretKey);
    if (type) url.searchParams.set("type", type);
    const data = await bandelFetch(url.toString(), { headers: bearerHeaders(accessToken) });
    return (data.logs || []) as ResellerActivity[];
  });
}

export async function fetchTopupTiers(): Promise<{ tiers: TopupTier[]; flashSaleEnabled: boolean }> {
  const data = await bandelFetch(`${BASE_URL}/api/pricing`);
  return {
    flashSaleEnabled: Boolean(data.flashSaleEnabled),
    tiers: ((data.tiers || []) as TopupTier[])
      .filter((tier) => tier.resellerEnabled)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  };
}

export async function fetchTopupHistory(secretKey: string, pin?: string): Promise<TopupTransaction[]> {
  return withBandelAuth(secretKey, pin, async (accessToken) => {
    const url = new URL(`${BASE_URL}/api/public/reseller/topup`);
    url.searchParams.set("token", secretKey);
    const data = await bandelFetch(url.toString(), { headers: bearerHeaders(accessToken) });
    if (data.success === false) throw new Error(String(data.error || "Gagal mengambil riwayat topup"));
    return (data.transactions || []) as TopupTransaction[];
  });
}

export async function createTopup(secretKey: string, tierId: string, pin?: string): Promise<CreatedTopup> {
  return withBandelAuth(secretKey, pin, async (accessToken) => {
    const data = await bandelFetch(`${BASE_URL}/api/public/reseller/topup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...bearerHeaders(accessToken) },
      body: JSON.stringify({ secretToken: secretKey, tierId }),
    });
    if (data.success === false) throw new Error(String(data.error || "Gagal membuat pembayaran topup"));
    return data as unknown as CreatedTopup;
  });
}

export async function fetchTopupStatus(secretKey: string, orderId: string, pin?: string): Promise<Record<string, unknown>> {
  return withBandelAuth(secretKey, pin, async (accessToken) => {
    const url = new URL(`${BASE_URL}/api/public/reseller/topup/status`);
    url.searchParams.set("token", secretKey);
    url.searchParams.set("orderId", orderId);
    const data = await bandelFetch(url.toString(), { headers: bearerHeaders(accessToken) });
    if (data.success === false) throw new Error(String(data.error || "Gagal mengecek status topup"));
    return data;
  });
}

export const BANDEL_DEFAULT_MEMBER_PIN = "111111";

export function generateMemberPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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
  validDays: number,
  pin?: string
): Promise<BandelCreatedKey> {
  return withBandelAuth(secretKey, pin, async (accessToken) => {
    const json = await bandelFetch(`${BASE_URL}/api/public/reseller/create-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...bearerHeaders(accessToken) },
      body: JSON.stringify({ secretToken: secretKey, maxTokens, validDays }),
    });
    const parsed = parseCreateKeyResponse(json);
    if (parsed.error) throw new Error(parsed.error);
    if (!parsed.dashboardUrl && !parsed.secretToken) {
      throw new Error("Create key OK tapi dashboardUrl kosong");
    }
    return parsed;
  });
}

/**
 * Setup kredensial pertama kali untuk member: password + PIN pilihan member
 * sendiri (diketik di dashboard gateway), diteruskan ke upstream.
 * Body: { password, pin, currentPin? } — confirmPassword/confirmPin divalidasi
 * di route gateway sebelum sampai sini.
 */
export async function setupCustomerCredentials(
  customerSecretToken: string,
  creds: { password: string; pin: string; currentPin?: string }
): Promise<{ accessToken: string; expiresIn?: number; pinChangedAt?: string; passwordChangedAt?: string }> {
  const body: Record<string, unknown> = {
    password: creds.password,
    confirmPassword: creds.password,
    pin: creds.pin,
    confirmPin: creds.pin,
  };
  if (creds.currentPin) body.currentPin = creds.currentPin;
  return bandelFetch(
    `${BASE_URL}/api/public/quota/${encodeURIComponent(customerSecretToken)}/setup-credentials`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }
  ) as Promise<{ accessToken: string; expiresIn?: number; pinChangedAt?: string; passwordChangedAt?: string }>;
}

/**
 * Provision key member baru TANPA kredensial: buyer hanya menerima URL
 * dashboard, lalu set password+PIN sendiri saat pertama kali membuka
 * dashboard (flow setup-credentials). Tanpa apiKey penuh — key lengkap
 * bisa dilihat member di dashboard setelah login.
 */
export async function provisionCustomerKey(
  resellerSecretKey: string,
  maxTokens: number,
  validDays: number,
  _memberPin?: string,
  resellerPin?: string
): Promise<BandelCreatedKey> {
  const created = await createCustomerKey(resellerSecretKey, maxTokens, validDays, resellerPin);
  const customerToken = created.secretToken;
  if (!customerToken) {
    throw new Error("create-key tanpa secretToken customer");
  }

  return { ...created, secretToken: customerToken, apiKey: created.apiKey ?? undefined };
}

export function formatBandelDelivery(result: BandelCreatedKey, code: string) {
  const pub = publicApiBase();
  const secret = result.secretToken;
  const url = secret ? `${pub}/quota/${secret}` : result.dashboardUrl || "";
  if (!url) throw new Error("dashboardUrl kosong");
  const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
  const lines = [
    `Paket: ${code}`,
    pack ? `Token: ${pack.tokens.toLocaleString("id-ID")} · ${pack.validDays} hari` : null,
    result.name ? `Nama: ${result.name}` : null,
    `Dashboard: ${url}`,
    `Buka dashboard untuk membuat Password & PIN dan melihat API Key kamu.`,
    `API Base: ${pub}/v1`,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}
