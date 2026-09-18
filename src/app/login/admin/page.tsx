"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, Eye, EyeOff, Loader2, ArrowLeft, Zap, KeyRound, Cpu, Activity, Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { loginAdmin } from "@/app/actions/auth";
import { useBrand } from "@/lib/use-brand";

const highlights = [
  {
    icon: Zap,
    title: "Kontrol Penuh",
    text: "Kelola produk, stok, dan transaksi dari satu panel terpusat.",
  },
  {
    icon: KeyRound,
    title: "Customer Keys",
    text: "Terbitkan dan pantau API key member secara real-time.",
  },
  {
    icon: Cpu,
    title: "Router Multi-Model",
    text: "Arahkan trafik ke upstream terbaik dengan sekali klik.",
  },
  {
    icon: Activity,
    title: "Statistik Live",
    text: "Monitoring omzet, margin, dan pemakaian token harian.",
  },
];

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const brand = useBrand();
  const siteName = brand?.siteName ?? "Neo API Gateway";
  const logoUrl = brand?.logoUrl;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginAdmin(formData);
      if (res && !res.ok) {
        setError(res.error ?? "Gagal masuk");
        setLoading(false);
      }
    } catch {
      setError("Gagal masuk");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-stretch overflow-hidden bg-base-bg">
      {/* ===== Panel kiri — showcase ===== */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-[#1C1917] p-10 text-white lg:flex xl:p-14">
        {/* Grid pattern */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-white/[0.04]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <pattern id="grid-admin-login" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-admin-login)" />
        </svg>

        {/* Glow orbs */}
        <motion.div
          animate={{ y: [0, -24, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#C2703D]/25 blur-[100px]"
        />
        <motion.div
          animate={{ y: [0, 24, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[#7C9070]/20 blur-[110px]"
        />

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center gap-3"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-9 max-w-[160px] object-contain" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-neo bg-gradient-to-br from-[#C2703D] to-[#A85A2E] shadow-lg">
              <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
            </span>
          )}
          <span className="text-lg font-extrabold tracking-tight">{siteName}</span>
          <span className="ml-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white/60">
            Admin
          </span>
        </motion.div>

        {/* Headline + highlights */}
        <div className="relative flex max-w-lg flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex flex-col gap-4"
          >
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
              <Lock className="h-3.5 w-3.5" />
              Area Terbatas
            </span>
            <h1 className="text-4xl font-black leading-tight tracking-tight xl:text-5xl">
              Pusat kendali
              <br />
              <span className="bg-gradient-to-r from-[#E8A778] to-[#B7C3A9] bg-clip-text text-transparent">
                {siteName}.
              </span>
            </h1>
            <p className="text-sm leading-relaxed text-white/50">
              Satu panel untuk seluruh operasional — katalog, transaksi, reseller, hingga bot Telegram.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {highlights.map((h, i) => {
              const Icon = h.icon;
              return (
                <motion.div
                  key={h.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="group rounded-neo border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <span className="mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-neo bg-gradient-to-br from-[#C2703D]/80 to-[#A85A2E]/80 shadow-lg transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
                    <Icon className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
                  </span>
                  <p className="text-sm font-extrabold">{h.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/45">{h.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer kiri */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative text-[11px] font-semibold text-white/30"
        >
          © {new Date().getFullYear()} {siteName} · Admin Console
        </motion.p>
      </div>

      {/* ===== Panel kanan — form login ===== */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-10 sm:px-8 lg:w-[480px] lg:shrink-0 xl:w-[520px]">
        {/* Dekorasi (mobile) */}
        <svg
          className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 text-accent-terra/10 lg:hidden"
          viewBox="0 0 200 200"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="100" cy="100" r="80" />
        </svg>
        <svg
          className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 text-accent-sage/10 lg:hidden"
          viewBox="0 0 200 200"
          fill="currentColor"
          aria-hidden
        >
          <polygon points="100,20 180,180 20,180" />
        </svg>

        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-full max-w-sm"
        >
          <div className="relative overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-lg">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#C2703D] via-[#D9C7A7] to-[#7C9070]" />
            <div className="flex flex-col items-center gap-2.5 border-b border-base-line p-6">
              <div className="relative">
                <motion.span
                  animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 rounded-neo bg-[#C2703D]/40"
                />
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 18 }}
                  className="relative inline-flex h-12 w-12 items-center justify-center rounded-neo bg-gradient-to-br from-[#C2703D] to-[#A85A2E] shadow-neo-sm"
                >
                  <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2.5} />
                </motion.span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">Admin Login</h2>
              <p className="text-center text-xs font-semibold text-base-ink/55">
                Masuk untuk mengelola token & transaksi
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-neo border border-base-line bg-accent-terraSoft px-4 py-2.5 text-sm font-semibold text-accent-terraDeep shadow-neo-sm"
                >
                  {error}
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Input
                  label="Email Admin"
                  name="email"
                  type="email"
                  placeholder="email@domain.com"
                  autoComplete="email"
                  required
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-base-ink"
                >
                  Password
                </label>
                <div className="group relative mt-1.5">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-base-ink/35 transition-colors duration-200 group-focus-within:text-accent-terra"
                    strokeWidth={2.5}
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-neo border border-base-line bg-base-surface py-2.5 pl-10 pr-11 text-base text-base-ink shadow-neo-sm outline-none transition-all duration-200 focus:border-accent-terra focus:shadow-neo"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-base-ink/50 transition-colors hover:text-base-ink"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="flex items-center justify-between"
              >
                <label className="group flex cursor-pointer select-none items-center gap-2.5 text-sm font-semibold">
                  <span className="relative flex h-4.5 w-4.5 items-center justify-center">
                    <input
                      type="checkbox"
                      className="peer h-4.5 w-4.5 cursor-pointer appearance-none rounded-[0.3rem] border-2 border-base-line bg-base-surface transition-all duration-150 checked:border-base-ink checked:bg-base-ink"
                    />
                    <motion.svg
                      initial={false}
                      className="pointer-events-none absolute h-3 w-3 text-base-bg opacity-0 transition-opacity peer-checked:opacity-100"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </motion.svg>
                  </span>
                  Ingat saya
                </label>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </motion.div>
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="border-t border-base-line p-4"
            >
              <Link
                href="/"
                className="group flex items-center justify-center gap-2 text-sm font-semibold text-base-ink/60 transition-colors hover:text-base-ink"
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                Kembali ke beranda
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
