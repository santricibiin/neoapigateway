export const DEFAULT_MESSAGES = {
  welcomeText:
    "✨ *Selamat datang, {name}*\n\n" +
    "👤 Akun · `{username}`\n" +
    "🗓 {tanggal}\n\n" +
    "🛍 Katalog premium siap dibuka\\.\n" +
    "Ketik /produk untuk mulai belanja dengan nyaman\\.",

  categoryText:
    "🏷 *Katalog Kategori*\n\n" +
    "{kategori}\n\n" +
    "👆 Pilih nomor kategori lewat tombol di bawah\\.\n" +
    "📄 Gunakan ‹ › bila ada lebih dari satu halaman\\.",

  productListText:
    "📦 *{kategori}*\n\n" +
    "{produk}\n\n" +
    "🔍 Ketuk nomor produk untuk detail, stok, dan harga\\.\n" +
    "📄 Navigasi: ‹ ›",

  productDetailText:
    "💎 *{nama}*\n\n" +
    "🔖 Kode · `{kode}`\n" +
    "📁 Kategori · {kategori}\n" +
    "💰 Harga · {harga}\n" +
    "📊 Stok · {stok} unit\n" +
    "🛒 Jumlah · {jumlah}\n" +
    "🧾 Estimasi · {total}\n\n" +
    "📝 *Detail*\n{detail}\n\n" +
    "Atur jumlah \\(− / ✎ / \\+\\) lalu tekan *Beli sekarang*\\.",

  qrisInvoiceText:
    "💳 *Invoice · Menunggu pembayaran*\n\n" +
    "🆔 `{invoice}`\n" +
    "📦 *{nama}*\n" +
    "🔖 `{kode}`\n" +
    "💵 Harga · {harga}\n" +
    "🔢 Qty · {jumlah}\n" +
    "🏷 Dasar · {total_dasar}\n" +
    "🔐 Kode unik · `{kode_unik}`\n" +
    "💎 *Total transfer · {total}*\n" +
    "🏦 Metode · {provider}\n" +
    "⏳ Berlaku *{ttl_menit} menit*\n\n" +
    "📷 Scan QRIS di bawah\\.\n" +
    "⚠️ Transfer *persis* sesuai total agar otomatis terverifikasi\\.",

  paymentSuccessText:
    "✅ *Pembayaran berhasil*\n\n" +
    "🆔 `{invoice}`\n" +
    "📦 *{nama}*\n" +
    "🔖 `{kode}`\n" +
    "🔢 Qty · {jumlah}\n" +
    "💰 Total · *{total}*\n\n" +
    "🎁 *Item kamu* \\(ketuk & tahan untuk salin\\)\n" +
    "{produk_items}\n\n" +
    "🔒 Simpan data di atas dengan aman\\.",

  thankYouText:
    "🙏 *Terima kasih*\n\n" +
    "Pesanan *{nama}* sudah kami proses\\.\n" +
    "🆔 `{invoice}` · 💰 *{total}* · qty {jumlah}\n\n" +
    "✨ Senang bisa melayani Anda\\. Belanja lagi kapan saja lewat /produk\\.",

  qrisExpiredText:
    "⌛ *Pembayaran kedaluwarsa*\n\n" +
    "🆔 `{invoice}`\n" +
    "📦 {nama}\n" +
    "💰 *{total}*\n\n" +
    "QRIS tidak lagi berlaku\\.\n" +
    "Silakan buat pesanan baru dari katalog jika masih berminat\\.",
} as const;

export const DEFAULT_FX = {
  welcomeSticker:
    "CAACAgIAAxkBAAFBZoNpek7t5XpBSQyx71F5KpWCHspcvAACmRMAAk_G4EtmVpv_p5tHszgE",
  purchaseSticker:
    "CAACAgIAAxkBAAFBZjNpekng6zdLdZNGcsD45eEHaq77tgACcRUAAsBkuErul7_0nKfkUjgE",
  welcomeEffect: "" as string,
  purchaseEffect: "" as string,
  flashMs: 3000,
} as const;
