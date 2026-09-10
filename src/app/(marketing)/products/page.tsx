import { getPublicProducts } from "@/app/actions/products";
import { ProductsClient } from "@/components/catalog/products-client";

export default async function ProductsPage() {
  const result = await getPublicProducts();

  if (!result.ok) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold">Gagal memuat produk</h1>
        <p className="text-base-ink/70">Silakan refresh halaman atau coba lagi nanti.</p>
        <a href="/" className="text-sm font-bold text-accent-sky hover:underline">Kembali ke Beranda</a>
      </div>
    );
  }

  const products = result.data.map((p) => ({
    id: p.id,
    name: p.name,
    model: p.model,
    description: p.description,
    price: Number(p.price),
    sku: p.sku,
    stockMode: p.stockMode,
    stock: p.stock,
    category: p.category ? { name: p.category.name } : null,
  }));

  return <ProductsClient products={products} />;
}
