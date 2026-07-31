"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertCircle, BadgeCheck, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResellerActivity, ResellerData, ResellerKey } from "@/lib/bandelbanget";

function formatNumber(value: number | undefined): string {
  return (value ?? 0).toLocaleString("id-ID");
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string | number | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityDetail(item: ResellerActivity): string {
  return item.detail || item.description || item.message || item.note || "Aktivitas reseller";
}

function activityTarget(item: ResellerActivity): string | null {
  return item.target_key_name || item.key_name || item.targetName || item.name || null;
}

export function ResellerClient({
  data: initialData,
  keys: initialKeys,
  activity: initialActivity,
  error: initialError,
}: {
  data: ResellerData | null;
  keys: ResellerKey[];
  activity: ResellerActivity[];
  error: string | null;
}) {
  const [data, setData] = useState(initialData);
  const [keys, setKeys] = useState(initialKeys);
  const [activity, setActivity] = useState(initialActivity);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/dashboard/reseller/api", { method: "POST" });
      const result = await response.json();
      if (!result.ok) {
        setError(result.error || "Gagal memuat data");
      } else {
        setData(result.data);
        setKeys(result.keys);
        setActivity(result.activity);
      }
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold">Reseller</h1>
          <p className="text-sm text-base-ink/60">Saldo dan penggunaan API BandelBanget</p>
        </div>
        <Card className="bg-red-50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" strokeWidth={2.5} />
            <div>
              <p className="font-bold text-red-700">{error}</p>
              <p className="mt-1 text-sm text-red-600/70">
                Pastikan Secret Key dan PIN sudah diatur di Pengaturan
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const balance = data?.resellerBalance ?? data?.balance ?? 0;
  const quota = data?.resellerQuota ?? 0;
  const keyUsage = keys.reduce((total, key) => total + (key.usage?.total_tokens ?? 0), 0);
  const totalUsage = data?.usage?.total_tokens ?? keyUsage;
  const chartData = [
    { name: "Total", tokens: quota },
    { name: "Terpakai", tokens: totalUsage },
    { name: "Sisa", tokens: balance },
  ];
  const resellerName = data?.name || "Reseller BandelBanget";
  const resellerId = data?.resellerId || data?.id || "-";

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold">{resellerName}</h1>
            <BadgeCheck className="h-5 w-5 text-sky-600" strokeWidth={2.5} />
          </div>
          <p className="text-xs font-semibold text-base-ink/55">Reseller ID: {resellerId}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-neo border-2 border-base-ink bg-red-100 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" strokeWidth={2.5} />
          {error}
        </div>
      )}

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Card hover className="bg-accent-sky/30">
          <CardContent className="flex items-center gap-3 p-4 sm:p-5">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky shadow-neo-sm">
              <Wallet className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div>
              <p className="text-sm font-bold text-base-ink/60">Sisa Saldo</p>
              <p className="text-2xl font-extrabold sm:text-3xl">{formatNumber(balance)}</p>
              <p className="text-xs text-base-ink/50">tokens tersedia</p>
            </div>
          </CardContent>
        </Card>

        <Card hover className="bg-accent-sun/30">
          <CardContent className="flex items-center gap-3 p-4 sm:p-5">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sun shadow-neo-sm">
              <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div>
              <p className="text-sm font-bold text-base-ink/60">Total Token</p>
              <p className="text-2xl font-extrabold sm:text-3xl">{formatNumber(quota)}</p>
              <p className="text-xs text-base-ink/50">total kuota reseller</p>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
              Grafik Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#0F172A" strokeDasharray="5 5" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fill: "#0F172A", fontSize: 12, fontWeight: 700 }} />
                  <YAxis
                    width={52}
                    tick={{ fill: "#0F172A", fontSize: 11 }}
                    tickFormatter={formatCompact}
                  />
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value)), "Token"]}
                    contentStyle={{
                      border: "2px solid #0F172A",
                      borderRadius: "8px",
                      boxShadow: "4px 4px 0 #0F172A",
                      fontWeight: 700,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="tokens"
                    stroke="#0F172A"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#7DD3FC", stroke: "#0F172A", strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: "#FDE047", stroke: "#0F172A", strokeWidth: 2 }}
                    animationBegin={200}
                    animationDuration={1300}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-neo border-2 border-base-ink bg-accent-sun px-3 py-1.5">
                Terpakai: {formatNumber(totalUsage)}
              </span>
              <span className="rounded-neo border-2 border-base-ink bg-accent-mint px-3 py-1.5">
                Sisa: {formatNumber(balance)}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.24 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" strokeWidth={2.5} />
              Aktivitas Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="py-10 text-center text-sm text-base-ink/50">Belum ada aktivitas</p>
            ) : (
              <div className="grid max-h-[26rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {activity.slice(0, 12).map((item, index) => (
                  <motion.div
                    key={item.id ?? index}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.04 }}
                    className="rounded-neo border-2 border-base-ink bg-base-bg p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-extrabold uppercase">
                        {item.type?.replace(/_/g, " ") || "Aktivitas"}
                      </span>
                      <span className="shrink-0 text-[11px] text-base-ink/50">
                        {formatDate(item.createdAt || item.timestamp)}
                      </span>
                    </div>
                    {activityTarget(item) && (
                      <p className="mt-2 text-sm font-extrabold">{activityTarget(item)}</p>
                    )}
                    <p className="mt-2 text-sm font-medium text-base-ink/70">{activityDetail(item)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-extrabold">
                      {item.token_amount !== undefined && item.token_amount !== null && (
                        <span className="rounded-neo bg-accent-sun px-2 py-1">
                          Token: {formatNumber(item.token_amount)}
                        </span>
                      )}
                      {item.balance_after !== undefined && item.balance_after !== null && (
                        <span className="rounded-neo bg-accent-mint px-2 py-1">
                          Saldo: {formatNumber(item.balance_after)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
