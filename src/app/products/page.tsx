import Link from "next/link";
import { getPublicProducts } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FloatingShapes } from "@/components/shared/floating-shapes";
import { BadgeCheck, Package, ShoppingCart, Search } from "lucide-react";

function formatRupiah(value: number | string | bigint) {
  const num = Number(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function groupByCategory<T extends { category: { name: string } | null }>(
  items: T[]
) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = item.category?.name ?? "Lainnya";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export default async function ProductsPage() {
  const result = await getPublicProducts();

  if (!result.ok) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold">Gagal memuat produk</h1>
        <p className="text-base-ink/70">Silakan refresh halaman atau coba lagi nanti.</p>
        <Link href="/">
          <Button variant="outline">Kembali ke Beranda</Button>
        </Link>
      </div>
    );
  }

  if (!result.data.length) {
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

  const grouped = groupByCategory(result.data);
  const categories = Object.keys(grouped).sort();

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
        <Link href="/track" className="relative">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4" />
            Cek Pesanan
          </Button>
        </Link>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {grouped[category].map((product) => (
                <Card
                  key={product.id}
                  hover
                  className="flex h-full flex-col justify-between p-4 sm:p-6"
                >
                  <CardHeader className="space-y-1.5 sm:space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-base-ink/50 sm:text-xs">
                      {product.model}
                    </div>
                    <CardTitle className="text-lg sm:text-xl">{product.name}</CardTitle>
                    <CardDescription className="line-clamp-3 text-sm">
                      {product.description ?? "Token API AI siap pakai."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-3 sm:pt-4">
                    <div className="flex flex-col gap-2.5 sm:gap-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-[10px] font-semibold text-base-ink/50 sm:text-xs">
                            Harga
                          </div>
                          <div className="text-lg font-extrabold text-base-ink sm:text-xl">
                            {formatRupiah(product.price.toNumber())}
                          </div>
                        </div>
                        {product.sku && (
                          <div className="rounded-neo border-2 border-base-ink bg-base-bg px-2 py-1 text-[10px] font-bold sm:text-xs">
                            {product.sku}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-base-ink/70">
                          Stok:
                        </span>
                        <span
                          className={`rounded-neo border-2 border-base-ink px-2 py-0.5 text-[10px] font-bold sm:text-xs ${
                            product.stockMode === "external"
                              ? "bg-accent-mint"
                              : product.stock > 0
                                ? "bg-accent-mint"
                                : "bg-accent-sun"
                          }`}
                        >
                          {product.stockMode === "external"
                            ? "Tersedia"
                            : product.stock > 0
                              ? `${product.stock} tersedia`
                              : "Habis"}
                        </span>
                      </div>

                      <Link href={`/order/${product.id}`} className="mt-1">
                        <Button variant="primary" size="md" className="w-full">
                          <ShoppingCart className="h-4 w-4" />
                          Pesan Sekarang
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>

    </div>
  );
}
