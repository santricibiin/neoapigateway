"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { BadgeCheck, Package, ShoppingCart, Search, LayoutGrid, List, Coins, Boxes, Tag, Zap } from "lucide-react";
import { QUOTA_PACKAGES } from "@/lib/bandelbanget";
import { useT } from "@/lib/lang";

interface Product {
  id: number;
  name: string;
  model: string;
  description: string | null;
  price: number;
  sku: string | null;
  stockMode: string;
  stock: number;
  category: { name: string } | null;
}

type ViewMode = "card" | "table";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTokens(value: number) {
  if (value >= 1_000_000_000) return `${value / 1_000_000_000}B`;
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

function groupByCategory(items: Product[]) {
  return items.reduce<Record<string, Product[]>>((acc, item) => {
    const key = item.category?.name ?? "__none__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function getProductTokens(sku: string | null, model: string): number | null {
  const code = (sku || model || "").toUpperCase();
  const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
  return pack?.tokens ?? null;
}

interface Availability {
  available: boolean;
  labelId: string;
  count?: number;
}

function getAvailability(p: Product, resellerQuota: number | null): Availability {
  if (p.stockMode === "external") {
    const tokens = getProductTokens(p.sku, p.model);
    const available = resellerQuota === null ? true : tokens !== null ? tokens <= resellerQuota : true;
    return { available, labelId: available ? "Tersedia" : "Stok habis" };
  }
  return p.stock > 0
    ? { available: true, labelId: "tersedia", count: p.stock }
    : { available: false, labelId: "Habis" };
}

const grid = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const cell = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export function ProductsClient({ products }: { products: Product[] }) {
  const [resellerQuota, setResellerQuota] = useState<number | null>(null);
  const [mode, setMode] = useState<ViewMode>("card");
  const t = useT();

  useEffect(() => {
    fetch("/api/public/reseller-quota")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setResellerQuota(d.quota);
      })
      .catch(() => {});
  }, []);

  if (!products.length) {
    return (
      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-4 overflow-hidden px-4 py-20 text-center">
        <FloatingShapes />
        <h1 className="relative text-2xl font-extrabold">{t("Belum ada produk")}</h1>
        <p className="relative text-base-ink/70">{t("Produk akan segera tersedia. Pantau terus halaman ini.")}</p>
        <Link href="/" className="relative">
          <Button variant="outline">{t("Kembali ke Beranda")}</Button>
        </Link>
      </div>
    );
  }

  const grouped = groupByCategory(products);
  const categories = Object.keys(grouped).sort();
  const totalAvailable = products.filter((p) => getAvailability(p, resellerQuota).available).length;

  const modeTabs: Array<{ id: ViewMode; labelId: string; icon: typeof LayoutGrid }> = [
    { id: "card", labelId: "Card", icon: LayoutGrid },
    { id: "table", labelId: "Tabel", icon: List },
  ];

  return (
    <div className="relative flex flex-col gap-8 overflow-hidden sm:gap-10 lg:gap-14">
      <FloatingShapes />

      {/* Hero */}
      <section className="relative flex flex-col items-center gap-4 pt-6 text-center sm:pt-10">
        <svg className="pointer-events-none absolute inset-0 h-full w-full text-base-ink/[0.04]" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <defs>
            <pattern id="grid-products" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-products)" />
        </svg>

        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-neo border border-base-line bg-accent-sun px-4 py-1.5 text-sm font-bold shadow-neo-sm"
        >
          <Package className="mr-1.5 inline-block h-4 w-4" />
          {totalAvailable} {t("paket siap pakai")}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
        >
          {t("Pilih Paket Token API")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative max-w-xl text-sm text-base-ink/70 sm:text-base"
        >
          {t("Stok real-time, harga jelas, aktif instan setelah pembayaran.")}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/track">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4" />
              {t("Cek Pesanan")}
            </Button>
          </Link>
          <div className="flex items-center rounded-neo border border-base-line bg-base-surface p-0.5 shadow-neo-sm">
            {modeTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  aria-pressed={mode === tab.id}
                  className={`flex items-center gap-1.5 rounded-[0.35rem] px-3 py-1.5 text-xs font-black uppercase transition-colors ${
                    mode === tab.id ? "bg-base-ink text-white" : "text-base-ink/60 hover:text-base-ink"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {t(tab.labelId)}
                </button>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Daftar produk */}
      <section className="relative flex flex-col gap-8 sm:gap-10">
        {categories.map((category) => (
          <div key={category} className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-neo border border-base-line bg-accent-sky shadow-neo-sm">
                <BadgeCheck className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-extrabold sm:text-xl">{category === "__none__" ? t("Lainnya") : category}</h2>
              <span className="text-xs font-bold text-base-ink/40">
                {grouped[category].length} {t("paket")}
              </span>
            </div>

            {mode === "card" ? (
              <motion.div
                key={`card-${category}`}
                variants={grid}
                initial="hidden"
                animate="show"
                className="mx-auto grid w-full max-w-sm grid-cols-1 gap-3 min-[480px]:max-w-none min-[480px]:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {grouped[category].map((product) => {
                  const { available, labelId, count } = getAvailability(product, resellerQuota);
                  const tokens = getProductTokens(product.sku, product.model);
                  return (
                    <motion.div
                      key={product.id}
                      variants={cell}
                      whileHover={{ y: -3 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="flex flex-col rounded-neo border border-base-line bg-base-surface p-4 shadow-neo-sm transition-shadow hover:shadow-neo"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-extrabold" title={product.name}>
                            {product.name}
                          </p>
                          <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-base-ink/60">
                            <Tag className="h-3 w-3" strokeWidth={2.5} />
                            {product.model}
                          </span>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-base-line px-2 py-0.5 text-[10px] font-black uppercase ${
                            available ? "bg-accent-mint" : "bg-accent-terraSoft"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-accent-sageDeep" : "bg-[#B4522E]"}`} />
                          {available ? t("Aktif") : t("Habis")}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-base-line pt-3">
                        <span className="inline-flex items-center gap-1 rounded-neo border border-base-line bg-base-bg px-1.5 py-0.5 font-mono text-[10px] font-black">
                          <Coins className="h-3 w-3" strokeWidth={2.5} />
                          {tokens !== null ? `${formatTokens(tokens)} tok` : product.sku ?? "-"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-neo border border-base-line bg-base-bg px-1.5 py-0.5 text-[10px] font-black">
                          <Boxes className="h-3 w-3" strokeWidth={2.5} />
                          {count !== undefined ? `${count} ${t(labelId)}` : t(labelId)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-lg font-extrabold">{formatRupiah(product.price)}</div>
                        {available ? (
                          <Link href={`/order/${product.id}`}>
                            <Button variant="primary" size="sm">
                              <ShoppingCart className="h-3.5 w-3.5" />
                              {t("Pesan")}
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="outline" size="sm" disabled className="cursor-not-allowed opacity-50">
                            {t("Habis")}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div
                key={`table-${category}`}
                className="overflow-hidden rounded-neo border border-base-line bg-base-surface shadow-neo-sm"
              >
                <div className="divide-y divide-base-line">
                  {grouped[category].map((product) => {
                    const { available, labelId, count } = getAvailability(product, resellerQuota);
                    return (
                      <div
                        key={product.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3.5 transition-colors hover:bg-base-bg/60 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center md:gap-4"
                      >
                        {/* Kiri: produk + model */}
                        <div className="min-w-0 md:pr-4">
                          <p className="truncate font-extrabold" title={product.name}>
                            {product.name}
                          </p>
                          <p className="truncate font-mono text-xs font-bold text-base-ink/50">{product.model}</p>
                        </div>

                        {/* Stok — HP: kanan atas; tablet/PC: kolom sendiri */}
                        <div className="col-start-2 row-start-1 justify-self-end md:col-start-2 md:row-start-1">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border border-base-line px-2 py-0.5 text-[10px] font-black uppercase ${
                              available ? "bg-accent-mint" : "bg-accent-terraSoft"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-accent-sageDeep" : "bg-[#B4522E]"}`} />
                            {count !== undefined ? `${count} ${t(labelId)}` : t(labelId)}
                          </span>
                        </div>

                        {/* Harga — HP: baris kedua; tablet/PC: kolom kanan */}
                        <div className="col-start-1 row-start-2 items-baseline gap-1.5 md:col-start-3 md:row-start-1 md:justify-self-end">
                          <span className="text-[10px] font-black uppercase text-base-ink/40 md:hidden">{t("Harga")}</span>
                          <p className="text-sm font-extrabold md:text-base">{formatRupiah(product.price)}</p>
                        </div>

                        {/* Aksi — HP: baris kedua kanan; tablet/PC: kolom terakhir */}
                        <div className="col-start-2 row-start-2 justify-self-end md:col-start-4 md:row-start-1">
                          {available ? (
                            <Link href={`/order/${product.id}`}>
                              <Button variant="primary" size="sm">
                                <ShoppingCart className="h-3.5 w-3.5" />
                                {t("Pesan")}
                              </Button>
                            </Link>
                          ) : (
                            <Button variant="outline" size="sm" disabled className="cursor-not-allowed opacity-50">
                              {t("Habis")}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Info bar bawah */}
      <section className="relative flex flex-col items-center gap-4 rounded-neo border border-base-line bg-base-surface p-5 text-center shadow-neo-sm sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-neo border border-base-line bg-accent-sun">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">{t("Siap mulai?")}</h2>
            <p className="mt-0.5 text-sm text-base-ink/60">
              {t("Pembayaran QRIS, token langsung terkirim otomatis.")}
            </p>
          </div>
        </div>
        <Link href="/track" className="w-full shrink-0 sm:w-auto">
          <Button variant="primary" size="md" className="w-full sm:w-auto">
            <Search className="h-4 w-4" />
            {t("Cek Pesanan")}
          </Button>
        </Link>
      </section>
    </div>
  );
}
