"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAdmin } from "@/app/actions/auth";

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base-bg px-4 py-10">
      <svg
        className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 text-accent-sky/20"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <circle cx="100" cy="100" r="80" />
      </svg>
      <svg
        className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 text-accent-sun/20"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <polygon points="100,20 180,180 20,180" />
      </svg>
      <svg
        className="pointer-events-none absolute top-1/3 right-10 h-40 w-40 text-accent-lavender/20"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <rect x="40" y="40" width="120" height="120" transform="rotate(15 100 100)" />
      </svg>

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-base-ink/[0.03]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <pattern id="grid-login" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-login)" />
      </svg>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-lg">
          <div className="flex flex-col items-center gap-3 border-b-2 border-base-ink bg-accent-lavender p-6">
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 18 }}
              className="inline-flex h-14 w-14 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sun shadow-neo-sm"
            >
              <ShieldCheck className="h-7 w-7 text-base-ink" strokeWidth={2.5} />
            </motion.span>
            <h1 className="text-2xl font-extrabold tracking-tight">Admin Login</h1>
            <p className="text-sm text-base-ink/70">
              Masuk untuk mengelola token & transaksi
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-neo border-2 border-base-ink bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-neo-sm"
              >
                {error}
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Input
                label="Email Admin"
                name="email"
                type="email"
                placeholder="admin@neo.ai"
                autoComplete="email"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label
                htmlFor="password"
                className="text-sm font-semibold text-base-ink"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-neo border-2 border-base-ink bg-base-surface px-4 py-2.5 pr-12 text-base text-base-ink shadow-neo-sm outline-none transition-shadow focus:shadow-neo"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-ink/60 transition-colors hover:text-base-ink"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-2 border-base-ink accent-base-ink"
                />
                Ingat saya
              </label>
              <Link
                href="/login/admin/forgot"
                className="text-sm font-semibold text-base-ink/60 transition-colors hover:text-accent-sky"
              >
                Lupa password?
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
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

          <div className="border-t-2 border-base-ink p-4">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 text-sm font-semibold text-base-ink/60 transition-colors hover:text-base-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke beranda
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
