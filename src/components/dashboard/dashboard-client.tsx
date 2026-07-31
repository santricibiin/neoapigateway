"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";

interface DashboardClientProps {
  stats: {
    totalRevenue: number;
    totalSold: number;
    totalStock: number;
    totalTransactions: number;
    adminCount: number;
  };
  last7Days: { day: string; revenue: number; count: number }[];
  tokenSales: { name: string; sold: number; stock: number }[];
  statusBreakdown: { name: string; value: number; color: string }[];
  recentTransactions: {
    id: number;
    buyerName: string;
    buyerEmail: string;
    tokenName: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
}

const formatRupiah = (n: number) =>
  "Rp " + n.toLocaleString("id-ID");

const statusColor: Record<string, string> = {
  success: "bg-accent-mint",
  pending: "bg-accent-sun",
  failed: "bg-red-200",
};

const statusLabel: Record<string, string> = {
  success: "Sukses",
  pending: "Pending",
  failed: "Gagal",
};

export function DashboardClient({
  stats,
  last7Days,
  tokenSales,
  statusBreakdown,
  recentTransactions,
}: DashboardClientProps) {
  const statCards = [
    {
      label: "Total Pendapatan",
      value: formatRupiah(stats.totalRevenue),
      icon: DollarSign,
      accent: "bg-accent-mint",
    },
    {
      label: "Token Terjual",
      value: stats.totalSold.toString(),
      icon: TrendingUp,
      accent: "bg-accent-sky",
    },
    {
      label: "Total Transaksi",
      value: stats.totalTransactions.toString(),
      icon: ShoppingCart,
      accent: "bg-accent-sun",
    },
    {
      label: "Stok Tersedia",
      value: stats.totalStock.toString(),
      icon: Package,
      accent: "bg-accent-lavender",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-base-ink/60">
          Ringkasan penjualan token API AI
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center border-2 border-base-ink ${card.accent}`}
                  >
                    <Icon className="h-5 w-5 text-base-ink" strokeWidth={2.5} />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-base-ink/30" />
                </div>
                <div className="mt-4 text-2xl font-extrabold">{card.value}</div>
                <div className="mt-1 text-sm font-semibold text-base-ink/60">
                  {card.label}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Pendapatan 7 Hari Terakhir</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={last7Days}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7DD3FC" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#7DD3FC" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F172A20" />
                <XAxis
                  dataKey="day"
                  stroke="#0F172A"
                  style={{ fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  stroke="#0F172A"
                  style={{ fontSize: 12, fontWeight: 600 }}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                />
                <Tooltip
                  contentStyle={{
                    border: "2px solid #0F172A",
                    borderRadius: "0.5rem",
                    boxShadow: "4px 4px 0px 0px #0F172A",
                    fontWeight: 600,
                  }}
                  formatter={(v) => [formatRupiah(Number(v)), "Pendapatan"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0F172A"
                  strokeWidth={2}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Status Transaksi</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#0F172A"
                  strokeWidth={2}
                >
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    border: "2px solid #0F172A",
                    borderRadius: "0.5rem",
                    boxShadow: "4px 4px 0px 0px #0F172A",
                    fontWeight: 600,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex justify-center gap-4">
              {statusBreakdown.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 border border-base-ink"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs font-semibold">
                    {s.name} ({s.value})
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Penjualan per Token</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tokenSales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F172A20" />
                <XAxis
                  dataKey="name"
                  stroke="#0F172A"
                  style={{ fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  stroke="#0F172A"
                  style={{ fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    border: "2px solid #0F172A",
                    borderRadius: "0.5rem",
                    boxShadow: "4px 4px 0px 0px #0F172A",
                    fontWeight: 600,
                  }}
                  cursor={{ fill: "#0F172A10" }}
                />
                <Bar
                  dataKey="sold"
                  fill="#FDE047"
                  stroke="#0F172A"
                  strokeWidth={2}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="stock"
                  fill="#C4B5FD"
                  stroke="#0F172A"
                  strokeWidth={2}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Transaksi Terbaru</h2>
            <div className="flex flex-col gap-3">
              {recentTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-neo border-2 border-base-ink bg-base-bg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-3 w-3 border border-base-ink ${statusColor[t.status]}`}
                    />
                    <div>
                      <div className="text-sm font-bold">{t.buyerName}</div>
                      <div className="text-xs text-base-ink/60">
                        {t.tokenName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      {formatRupiah(t.amount)}
                    </div>
                    <div className="text-xs text-base-ink/60">
                      {statusLabel[t.status]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
