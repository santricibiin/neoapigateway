"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { BadgeCheck, Package, ShoppingCart, Search, LayoutGrid, List, Coins, Boxes, Tag } from "lucide-react";
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
    const key = item.category?.name ?? "Lainnya";
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
  label: string;
}

function getAvailability(p: Product, resellerQuota: number | null): Availability {
  if (p.stockMode === "external") {
    const tokens = getProductTokens(p.sku, p.model);
    const available = resellerQuota === null ? true : tokens !== null ? tokens <= resellerQuota : true;
    return { available, label: available ? "Tersedia" : "Stok habis" };
  }
  return p.stock > 0
    ? { available: true, label: `${p.stock} tersedia` }
    : { available: false, label: "Habis" };
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
        <h1 className="relative text-2xl font-extrabold">Belum ada produk</h1>
        <p className="relative text-base-ink/70">Produk akan segera tersedia. Pantau terus halaman ini.</p>
        <Link href="/" className="relative">
          <Button variant="outline">Kembali ke Beranda</Button>
        </Link>
      </div>
    );
  }

  const grouped = groupByCategory(products);
  const categories = Object.keys(grouped).sort();

  const modeTabs: Array<{ id: ViewMode; label: string; icon: typeof LayoutGrid }> = [
    { id: "card", label: "Card", icon: LayoutGrid },
    { id: "table", label: "Tabel", icon: List },
  ];

  return (
    <div className="relative mx-auto flex max-w-6xl flex-col gap-8 overflow-hidden px-3 py-4 sm:gap-10 sm:px-4 sm:py-6 lg:gap-12">
      <FloatingShapes />

      <section className="relative flex flex-col items-center gap-3 px-2 text-center sm:gap-4">
        <span className="inline-flex items-center gap-2 rounded-neo border-2 border-base-ink bg-accent-sun px-3 py-1 text-xs font-bold shadow-neo-sm sm:px-4 sm:py-1.5 sm:text-sm">
          <Package className="h-4 w-4" />
          Pilih Produk
        </span>
        <h1 className="relative max-w-2xl text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
          Daftar Token API AI Tersedia
        </h1>
        <p className="relative max-w-xl text-sm text-base-ink/70 sm:text-base">
          Pilih paket sesuai kebutuhan. Stok terbatas, harga jelas, dan aktif
          langsung setelah pemesanan.
        </p>
        <div className="relative flex items-center gap-3">
          <Link href="/track">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4" />
              {t("Cek Pesanan")}
            </Button>
          </Link>
          <div className="flex items-center rounded-neo border-2 border-base-ink bg-base-surface p-0.5 shadow-neo-sm">
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
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative flex flex-col gap-6 sm:gap-8 lg:gap-10">
        {categories.map((category) => (
          <div key={category} className="flex flex-col gap-3 sm:gap-4 lg:gap-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-neo border-2 border-base-ink bg-accent-sky shadow-neo-sm sm:h-8 sm:w-8">
                <BadgeCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
              <h2 className="text-lg font-extrabold sm:text-xl">{category}</h2>
            </div>

            {mode === "card" ? (
              <motion.div
                key={`card-${category}`}
                variants={grid}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {grouped[category].map((product) => {
                  const { available, label } = getAvailability(product, resellerQuota);
                  const tokens = getProductTokens(product.sku, product.model);
                  return (
                    <motion.div
                      key={product.id}
                      variants={cell}
                      whileHover={{ y: -3 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="flex flex-col rounded-neo border-2 border-base-ink bg-base-surface p-4 shadow-neo-sm transition-shadow hover:shadow-neo"
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
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-base-ink px-2 py-0.5 text-[10px] font-black uppercase ${
                            available ? "bg-accent-mint" : "bg-red-200"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-green-600" : "bg-red-500"}`} />
                          {available ? "Aktif" : "Habis"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t-2 border-dashed border-base-ink/15 pt-3">
                        <span className="inline-flex items-center gap-1 rounded-neo border-2 border-base-ink bg-base-bg px-1.5 py-0.5 font-mono text-[10px] font-black">
                          <Coins className="h-3 w-3" strokeWidth={2.5} />
                          {tokens !== null ? `${formatTokens(tokens)} tok` : product.sku ?? "-"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-neo border-2 border-base-ink bg-base-bg px-1.5 py-0.5 text-[10px] font-black">
                          <Boxes className="h-3 w-3" strokeWidth={2.5} />
                          {label}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-lg font-extrabold">{formatRupiah(product.price)}</div>
                        {available ? (
                          <Link href={`/order/${product.id}`}>
                            <Button variant="primary" size="sm">
                              <ShoppingCart className="h-3.5 w-3.5" />
                              Pesan
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="outline" size="sm" disabled className="cursor-not-allowed opacity-50">
                            Habis
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
                className="overflow-hidden rounded-neo border-2 border-base-ink bg-base-surface shadow-neo-sm"
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b-2 border-base-ink bg-base-bg text-xs font-black uppercase tracking-wider text-base-ink/70">
                        <th className="px-4 py-3">Produk</th>
                        <th className="px-4 py-3">Model</th>
                        <th className="px-4 py-3 text-center">Stok</th>
                        <th className="px-4 py-3 text-right">Harga</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[category].map((product, i) => {
                        const { available, label } = getAvailability(product, resellerQuota);
                        return (
                          <tr key={product.id} className={`border-b border-base-ink/10 ${i % 2 === 0 ? "bg-base-surface" : "bg-base-bg/50"}`}>
                            <td className="px-4 py-3">
                              <p className="font-extrabold">{product.name}</p>
                              {product.sku ? <p className="font-mono text-[10px] font-bold text-base-ink/40">{product.sku}</p> : null}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-base-ink/60">{product.model}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border-2 border-base-ink px-2 py-0.5 text-[10px] font-black uppercase ${
                                  available ? "bg-accent-mint" : "bg-red-200"
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-green-600" : "bg-red-500"}`} />
                                {label}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-extrabold">{formatRupiah(product.price)}</td>
                            <td className="px-4 py-3 text-right">
                              {available ? (
                                <Link href={`/order/${product.id}`}>
                                  <Button variant="primary" size="sm">
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                    Pesan
                                  </Button>
                                </Link>
                              ) : (
                                <Button variant="outline" size="sm" disabled className="cursor-not-allowed opacity-50">
                                  Habis
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
