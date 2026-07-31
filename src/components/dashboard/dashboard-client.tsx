"use client";

import { motion } from "framer-motion";
import { Activity, ArrowUpRight, Gauge, KeyRound, Users } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";

interface DashboardClientProps {
  stats: {
    totalCustomers: number;
    totalQuota: number;
    usedQuota: number;
    remainingQuota: number;
    totalRequests: number;
    promptTokens: number;
    completionTokens: number;
  };
  customerUsage: { name: string; used: number; requests: number }[];
  modelUsage: { name: string; tokens: number; requests: number }[];
  statusBreakdown: { name: string; value: number; color: string }[];
  topCustomers: { id: string; name: string; status: string; used: number; max: number; requests: number }[];
  error: string | null;
}

function format(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toLocaleString("id-ID");
}

const statusColor: Record<string, string> = {
  active: "bg-accent-mint",
  exceeded: "bg-accent-sun",
  expired: "bg-red-200",
};

export function DashboardClient({ stats, customerUsage, modelUsage, statusBreakdown, topCustomers, error }: DashboardClientProps) {
  const usagePercentage = stats.totalQuota ? Math.min(100, Math.round((stats.usedQuota / stats.totalQuota) * 100)) : 0;
  const statCards = [
    { label: "Total Customer", value: stats.totalCustomers.toLocaleString("id-ID"), detail: `${statusBreakdown[0]?.value || 0} aktif`, icon: Users, accent: "bg-accent-mint" },
    { label: "Kuota Terpakai", value: format(stats.usedQuota), detail: `${usagePercentage}% dari ${format(stats.totalQuota)}`, icon: Gauge, accent: "bg-accent-sky" },
    { label: "Sisa Kuota User", value: format(stats.remainingQuota), detail: `Total alokasi ${format(stats.totalQuota)}`, icon: KeyRound, accent: "bg-accent-sun" },
    { label: "Total Request", value: format(stats.totalRequests), detail: `${format(stats.promptTokens)} input · ${format(stats.completionTokens)} output`, icon: Activity, accent: "bg-accent-lavender" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Dashboard Customer</h1><p className="mt-1 text-sm text-base-ink/60">Ringkasan pemakaian kuota, request, dan model seluruh member</p></div>
      {error ? <p className="rounded-neo border-2 border-base-ink bg-red-200 p-4 text-sm font-bold">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}><Card className="relative overflow-hidden p-5"><svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 text-base-ink/[0.06]"><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="12" /></svg><div className="relative flex items-center justify-between"><span className={`inline-flex h-10 w-10 items-center justify-center border-2 border-base-ink ${card.accent}`}><Icon className="h-5 w-5" strokeWidth={2.5} /></span><ArrowUpRight className="h-4 w-4 text-base-ink/30" /></div><div className="relative mt-4 text-2xl font-extrabold">{card.value}</div><div className="relative mt-1 text-sm font-semibold text-base-ink/60">{card.label}</div><p className="relative mt-2 text-[10px] font-bold uppercase tracking-wide text-base-ink/40">{card.detail}</p></Card></motion.div>;
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card className="p-5"><h2 className="text-lg font-bold">Customer dengan Pemakaian Tertinggi</h2><p className="mb-4 text-xs font-semibold text-base-ink/50">Top 7 berdasarkan total token</p><ResponsiveContainer width="100%" height={280}><AreaChart data={customerUsage}><defs><linearGradient id="customerUsage" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7DD3FC" stopOpacity={0.8} /><stop offset="95%" stopColor="#7DD3FC" stopOpacity={0.1} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#0F172A20" /><XAxis dataKey="name" stroke="#0F172A" tick={{ fontSize: 10, fontWeight: 600 }} interval={0} angle={-12} textAnchor="end" height={60} /><YAxis stroke="#0F172A" tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={format} /><Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [format(Number(value)), name === "used" ? "Token" : "Request"]} /><Area type="monotone" dataKey="used" stroke="#0F172A" strokeWidth={2} fill="url(#customerUsage)" /></AreaChart></ResponsiveContainer></Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-5"><h2 className="text-lg font-bold">Status Customer</h2><p className="mb-4 text-xs font-semibold text-base-ink/50">Semua customer key</p><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={48} outerRadius={84} paddingAngle={3} dataKey="value" stroke="#0F172A" strokeWidth={2}>{statusBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer><div className="flex flex-wrap justify-center gap-3">{statusBreakdown.map((status) => <div key={status.name} className="flex items-center gap-1.5"><span className="h-3 w-3 border border-base-ink" style={{ backgroundColor: status.color }} /><span className="text-xs font-semibold">{status.name} ({status.value})</span></div>)}</div></Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="p-5"><h2 className="text-lg font-bold">Model Paling Sering Dipakai</h2><p className="mb-4 text-xs font-semibold text-base-ink/50">Akumulasi usage seluruh customer</p><ResponsiveContainer width="100%" height={300}><BarChart data={modelUsage} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#0F172A20" /><XAxis type="number" stroke="#0F172A" tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={format} /><YAxis type="category" dataKey="name" stroke="#0F172A" width={130} tick={{ fontSize: 10, fontWeight: 600 }} /><Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [format(Number(value)), name === "tokens" ? "Token" : "Request"]} cursor={{ fill: "#0F172A10" }} /><Bar dataKey="tokens" fill="#FDE047" stroke="#0F172A" strokeWidth={2} radius={[0, 4, 4, 0]} /><Bar dataKey="requests" fill="#C4B5FD" stroke="#0F172A" strokeWidth={2} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>{!modelUsage.length ? <p className="text-center text-sm font-bold text-base-ink/45">Belum ada usage model</p> : null}</Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="p-5"><h2 className="text-lg font-bold">Top Customer</h2><p className="mb-4 text-xs font-semibold text-base-ink/50">Urutan berdasarkan token terpakai</p><div className="flex flex-col gap-3">{topCustomers.map((customer, index) => { const percentage = customer.max ? Math.min(100, Math.round((customer.used / customer.max) * 100)) : 0; return <div key={customer.id} className="rounded-neo border-2 border-base-ink bg-base-bg px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky text-xs font-black">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{customer.name}</p><p className="font-mono text-[10px] text-base-ink/50">#{customer.id} · {format(customer.requests)} req</p></div></div><span className={`h-3 w-3 shrink-0 border border-base-ink ${statusColor[customer.status] || "bg-base-bg"}`} /></div><div className="mt-2 flex justify-between text-[10px] font-bold"><span>{format(customer.used)} token</span><span>{percentage}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full border border-base-ink bg-white"><div className="h-full bg-accent-lavender" style={{ width: `${percentage}%` }} /></div></div>; })}{!topCustomers.length ? <p className="py-12 text-center text-sm font-bold text-base-ink/45">Belum ada customer</p> : null}</div></Card>
        </motion.div>
      </div>
    </div>
  );
}

const tooltipStyle = {
  border: "2px solid #0F172A",
  borderRadius: "0.5rem",
  boxShadow: "4px 4px 0px 0px #0F172A",
  fontWeight: 600,
};
