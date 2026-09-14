import {
  fetchQuotaData,
  fetchQuotaMeta,
  setupCustomerCredentials,
  verifyPin,
} from "@/lib/bandelbanget";
import { publicV1Base } from "@/lib/bandel-upstream";
import { disabledModelIds } from "@/lib/model-gate";

export type QuotaDashboardView = {
  id: string | number;
  name: string;
  status: string;
  key: string;
  keyMasked: string;
  maxTokens: number;
  validDays: number | null;
  expiresAt: string | null;
  baseUrl: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cachedTokens: number;
    requests: number;
  };
  remainingTokens: number;
  usageByModel: Record<string, { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; requests?: number }>;
  models: Array<{ id: string; enabled: boolean; vision: boolean; description: string; multiplier: number; grade: string }>;
  modelMultipliers: Record<string, number>;
  resellerPhone: string | null;
};

function number(value: unknown, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export async function loadQuotaMeta(secretKey: string) {
  const meta = await fetchQuotaMeta(secretKey);
  return {
    id: meta.id ?? "",
    name: text(meta.name, "Member"),
    status: text(meta.status, "unknown"),
    pinSet: Boolean(meta.pinSet),
    credentialsSet: meta.credentialsSet ?? Boolean(meta.pinSet && meta.passwordSet),
    requiresCurrentPin: Boolean(meta.requiresCurrentPin),
    passwordSet: Boolean(meta.passwordSet),
    pinLockedUntil: meta.pinLockedUntil ?? null,
    resellerPhone: meta.resellerPhone ?? null,
    createdAt: meta.createdAt ?? null,
  };
}

export async function verifyQuotaPin(secretKey: string, pin: string, password?: string) {
  return verifyPin(secretKey, pin, password);
}

/**
 * Setup kredensial pertama kali untuk member (password + PIN pilihan sendiri).
 * Password sudah divalidasi di route sebelum diteruskan ke upstream.
 */
export async function setupQuotaCredentials(
  secretKey: string,
  creds: { password: string; pin: string; currentPin?: string }
) {
  return setupCustomerCredentials(secretKey, creds);
}

export async function loadQuotaDashboard(secretKey: string, accessToken: string): Promise<QuotaDashboardView> {
  const raw = await fetchQuotaData(secretKey, accessToken);
  const usageRaw = raw.usage || {};
  const usage = {
    prompt_tokens: number(usageRaw.prompt_tokens),
    completion_tokens: number(usageRaw.completion_tokens),
    total_tokens: number(usageRaw.total_tokens),
    cachedTokens: number(usageRaw.cachedTokens),
    requests: number(usageRaw.requests),
  };
  const maxTokens = number(raw.maxTokens ?? raw.balance);
  const rawModels = Array.isArray(raw.models) ? raw.models : [];
  const blocked = await disabledModelIds();
  const models = rawModels
    .map((model) => {
      const row = (model || {}) as Record<string, unknown>;
      return {
        id: text(row.id, "unknown"),
        enabled: Boolean(row.enabled),
        vision: Boolean(row.vision),
        description: text(row.description),
        multiplier: number(row.multiplier, 1),
        grade: text(row.grade, "-") || "-",
      };
    })
    .filter((model) => !blocked.has(model.id));
  return {
    id: raw.id ?? "",
    name: text(raw.name, "Member"),
    status: text(raw.status, "unknown"),
    key: text(raw.key),
    keyMasked: text(raw.keyMasked, "••••"),
    maxTokens,
    validDays: raw.validDays == null ? null : number(raw.validDays),
    expiresAt: raw.expiresAt == null ? null : String(raw.expiresAt),
    baseUrl: publicV1Base(),
    usage,
    remainingTokens: Math.max(0, maxTokens - usage.total_tokens),
    usageByModel: (raw.usageByModel || {}) as QuotaDashboardView["usageByModel"],
    models,
    modelMultipliers: (raw.modelMultipliers || {}) as Record<string, number>,
    resellerPhone: raw.resellerPhone == null ? null : String(raw.resellerPhone),
  };
}
