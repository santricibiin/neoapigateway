import { prisma } from "@/lib/prisma";
import { fetchResellerKeys, type ResellerKey } from "@/lib/bandelbanget";
import { publicV1Base } from "@/lib/bandel-upstream";

export type QuotaCheckResult =
  | {
      ok: true;
      name: string;
      status: string;
      keyMasked: string;
      maxTokens: number;
      usedTokens: number;
      remainingTokens: number;
      expiresAt: string | null;
      validDays: number | null;
      baseUrl: string;
      tag: string | null;
    }
  | { ok: false; error: string };

function matchKey(apiKey: string, row: ResellerKey) {
  if (row.key) return row.key === apiKey;
  const masked = (row.keyMasked || "").match(/^(.*?)(•+)(.*)$/);
  if (!masked || !masked[1] || !masked[3]) return false;
  return apiKey.startsWith(masked[1]) && apiKey.endsWith(masked[3]);
}

export async function checkQuotaByApiKey(rawKey: string): Promise<QuotaCheckResult> {
  const apiKey = rawKey.trim();
  if (apiKey.length < 12) return { ok: false, error: "API key tidak valid" };
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!setting?.secretKey) return { ok: false, error: "Reseller belum dikonfigurasi" };
  try {
    const payload = await fetchResellerKeys(setting.secretKey);
    const matches = payload.keys.filter((row) => matchKey(apiKey, row));
    if (!matches.length) return { ok: false, error: "API key tidak ditemukan" };
    if (matches.length > 1) return { ok: false, error: "Beberapa key cocok. Hubungi admin." };
    const row = matches[0];
    const maxTokens = Number(row.maxTokens || 0);
    const usedTokens = Number(row.usage?.total_tokens || 0);
    return {
      ok: true,
      name: row.name || "-",
      status: row.status || "unknown",
      keyMasked: row.keyMasked || `${apiKey.slice(0, 6)}••••${apiKey.slice(-4)}`,
      maxTokens,
      usedTokens,
      remainingTokens: Math.max(0, maxTokens - usedTokens),
      expiresAt: row.expiresAt || null,
      validDays: row.validDays ?? null,
      baseUrl: publicV1Base(),
      tag: row.tag ?? null,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal mengecek kuota" };
  }
}
