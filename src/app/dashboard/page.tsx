import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getSettingsRaw } from "@/app/actions/settings";
import { fetchResellerKeys, type ResellerKey } from "@/lib/bandelbanget";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ModelUsage = { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number; requests?: number };

function number(value: unknown) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function modelRows(key: ResellerKey) {
  const byModel = key.usage?.by_model;
  return byModel && typeof byModel === "object" ? (byModel as Record<string, ModelUsage>) : {};
}

export default async function DashboardPage() {
  const settings = await getSettingsRaw();
  let keys: ResellerKey[] = [];
  let error: string | null = null;
  if (!settings.secretKey) {
    error = "Secret Key reseller belum diatur";
  } else {
    try {
      keys = (await fetchResellerKeys(settings.secretKey)).keys;
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "Gagal mengambil data customer";
    }
  }

  const totalQuota = keys.reduce((sum, key) => sum + number(key.maxTokens), 0);
  const usedQuota = keys.reduce((sum, key) => sum + number(key.usage?.total_tokens), 0);
  const totalRequests = keys.reduce((sum, key) => sum + number(key.usage?.requests), 0);
  const promptTokens = keys.reduce((sum, key) => sum + number(key.usage?.prompt_tokens), 0);
  const completionTokens = keys.reduce((sum, key) => sum + number(key.usage?.completion_tokens), 0);

  const modelMap = new Map<string, { tokens: number; requests: number }>();
  for (const key of keys) {
    for (const [name, usage] of Object.entries(modelRows(key))) {
      const current = modelMap.get(name) || { tokens: 0, requests: 0 };
      current.tokens += number(usage.total_tokens);
      current.requests += number(usage.requests);
      modelMap.set(name, current);
    }
  }

  const modelUsage = Array.from(modelMap, ([name, usage]) => ({ name, ...usage }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 8);

  const customerUsage = keys
    .map((key) => ({
      name: key.name || `#${key.id}`,
      used: number(key.usage?.total_tokens),
      requests: number(key.usage?.requests),
    }))
    .sort((a, b) => b.used - a.used)
    .slice(0, 7);

  const statusBreakdown = [
    { name: "Aktif", value: keys.filter((key) => key.status === "active").length, color: "#86EFAC" },
    { name: "Habis", value: keys.filter((key) => key.status === "exceeded").length, color: "#FDE047" },
    { name: "Expired", value: keys.filter((key) => key.status === "expired").length, color: "#FCA5A5" },
  ];

  const topCustomers = keys
    .map((key) => ({
      id: String(key.id),
      name: key.name || "Tanpa nama",
      status: key.status || "unknown",
      used: number(key.usage?.total_tokens),
      max: number(key.maxTokens),
      requests: number(key.usage?.requests),
    }))
    .sort((a, b) => b.used - a.used)
    .slice(0, 6);

  // Omzet & margin dari PaymentOrder berstatus paid
  const paidOrders = await prisma.paymentOrder.findMany({
    where: { status: "paid" },
    select: { amount: true, qty: true, unitPrice: true, unitCost: true },
  });
  const omzet = paidOrders.reduce((sum, order) => sum + order.unitPrice * order.qty, 0);
  const margin = paidOrders.reduce((sum, order) => sum + (order.unitPrice - order.unitCost) * order.qty, 0);

  return (
    <DashboardClient
      stats={{
        totalCustomers: keys.length,
        totalQuota,
        usedQuota,
        remainingQuota: Math.max(0, totalQuota - usedQuota),
        totalRequests,
        promptTokens,
        completionTokens,
        omzet,
        margin,
      }}
      customerUsage={customerUsage}
      modelUsage={modelUsage}
      statusBreakdown={statusBreakdown}
      topCustomers={topCustomers}
      error={error}
    />
  );
}
