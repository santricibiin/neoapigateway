"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Package, Gauge, Globe, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrand } from "@/lib/use-brand";
import { useLang, useT, type Lang } from "@/lib/lang";

const navLinks = [
  { href: "/", labelId: "Home", labelEn: "Home", icon: Home },
  { href: "/products", labelId: "Produk", labelEn: "Products", icon: Package },
  { href: "/cek-kuota", labelId: "Cek Kuota", labelEn: "Check Quota", icon: Gauge },
];

function LangToggle() {
  const { lang, setLang } = useLang();
  const options: Array<{ value: Lang; label: string }> = [
    { value: "id", label: "ID" },
    { value: "en", label: "EN" },
  ];
  return (
    <div className="flex items-center rounded-neo border-2 border-base-ink bg-base-surface p-0.5 shadow-neo-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLang(opt.value)}
          className={`flex items-center gap-1 rounded-[0.35rem] px-2 py-1 text-[11px] font-black uppercase transition-colors ${
            lang === opt.value ? "bg-base-ink text-white" : "text-base-ink/60 hover:text-base-ink"
          }`}
          aria-pressed={lang === opt.value}
        >
          <Globe className="h-3 w-3" strokeWidth={2.5} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Navbar() {
  const brand = useBrand();
  const t = useT();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const siteName = brand?.siteName ?? "Neo API Gateway";
  const logoUrl = brand?.logoUrl;
  const shortName = siteName.charAt(0).toUpperCase();

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-40 border-b-2 border-base-ink bg-base-bg/90 backdrop-blur"
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-8 max-w-[140px] object-contain" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sun text-lg font-extrabold shadow-neo-sm">
              {shortName}
            </span>
          )}
          {!logoUrl ? <span className="hidden text-sm font-extrabold tracking-tight sm:block">{siteName}</span> : null}
        </Link>

        <ul className="hidden items-center gap-1 sm:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center gap-1.5 rounded-neo px-3 py-1.5 text-sm font-bold text-base-ink/80 transition-all hover:bg-white hover:text-base-ink hover:shadow-neo-sm"
                >
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                  {t(link.labelId)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <LangToggle />
          <Link href="/products" className="hidden sm:block">
            <Button variant="sky" size="sm">{t("Order Token")}</Button>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-sm sm:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" strokeWidth={2.5} /> : <Menu className="h-4 w-4" strokeWidth={2.5} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t-2 border-base-ink/10 sm:hidden"
          >
            <ul className="flex flex-col gap-1 px-4 py-3">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-neo px-3 py-2 text-sm font-bold text-base-ink/80 hover:bg-white"
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.5} />
                      {t(link.labelId)}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link href="/products" onClick={() => setOpen(false)} className="mt-1 block">
                  <Button variant="sky" size="sm" className="w-full">{t("Order Token")}</Button>
                </Link>
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
