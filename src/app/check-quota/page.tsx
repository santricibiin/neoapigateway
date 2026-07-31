import type { Metadata } from "next";
import { QuotaCheckHero } from "@/components/quota/quota-check-hero";
import { QuotaCheckForm } from "@/components/quota/quota-check-form";
import { publicBrandName, publicV1Base } from "@/lib/bandel-upstream";

export const metadata: Metadata = {
  title: `Cek Kuota · ${publicBrandName()}`,
  description: "Cek sisa kuota menggunakan API key member.",
};

export default function CheckQuotaPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-base-bg p-4 sm:p-8">
      <svg aria-hidden className="pointer-events-none fixed inset-0 h-full w-full text-base-ink/[0.045]"><defs><pattern id="check-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="currentColor" /></pattern></defs><rect width="100%" height="100%" fill="url(#check-grid)" /></svg>
      <div className="relative mx-auto max-w-lg space-y-4">
        <QuotaCheckHero brandName={publicBrandName()} />
        <QuotaCheckForm />
        <div className="relative overflow-hidden rounded-neo border-2 border-base-ink bg-white p-4 shadow-neo-sm"><svg viewBox="0 0 120 50" aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-1/3 text-accent-sun/50"><path d="M10 40 35 10 60 40 85 10 110 40" fill="none" stroke="currentColor" strokeWidth="10" /></svg><div className="relative"><p className="text-[10px] font-extrabold uppercase tracking-widest text-base-ink/50">Base URL API</p><code className="mt-1 block break-all font-mono text-sm font-bold">{publicV1Base()}</code></div></div>
      </div>
    </main>
  );
}
