# GoPay Merchant 2 — Integrasi gopay-api-gateway

Metode pembayaran `gopaymerchant2`: QRIS dinamis + deteksi lunas otomatis via
[gopay-api-gateway](https://github.com/ahmadzakiyox/gopay-api-gateaway)
(self-hosted, jalan di VPS yang sama). Tidak mengganggu alur notif APK
(DANA/Neobank/GoPay Merchant lama) — keduanya bisa aktif bersamaan di site berbeda
atau bergantian per site.

> Dokumen ini lengkap: setup gateway, setup per website, DAN panduan
> mengimplementasikan fitur ini ke script/site lain (bagian D–F).

## Arsitektur

```
[GoPay Merchant / GoBiz] ←── OTP login 1x (node login.js)
        ↑
[gopay-api-gateway]  :3005  (PM2, 24/7, token auto-refresh 6 jam)
        ↑
[Website A (bot4)]  ─┐
[Website B (bot5)]  ─┴─ nembak http://127.0.0.1:3005 (server-to-server, API key)
```

- **1 gateway** melayani semua site di VPS yang sama (port beda dari web).
- Tiap order dapat `trx_id` unik → 2 pembayaran nominal sama tidak saling klaim.
- Alur forward notif APK (`/api/payment/callback`) **TIDAK disentuh**.
- Kode unik nominal (1–499) tetap dipertahankan sebagai lapis anti-tabrakan kedua.

---

## A. Setup Gateway di VPS (sekali untuk semua site)

```bash
# 1. Clone & install
cd /opt
git clone https://github.com/ahmadzakiyox/gopay-api-gateaway.git gopay-gateway
cd gopay-gateway
npm install

# 2. Config
cp .env.example .env
nano .env
```

Isi `.env` gateway:

```env
PORT=3005
API_KEY=<string-rahasia-panjang>
QRIS_STATIC=<payload-qris-statis-dari-GoBiz>   # bisa juga di-push dari dashboard web nanti
GOPAY_MERCHANT_ID=<merchant-id-dari-GoBiz>      # contoh: G340142294
```

```bash
# 3. Login OTP — 1x saja (masukin no HP GoBiz + OTP SMS/WA)
node login.js

# 4. Jalan permanen
sudo npm install -g pm2
pm2 start server.js --name gopay-gateway
pm2 save && pm2 startup

# 5. Tes
curl "http://127.0.0.1:3005/token-status?api_key=<API_KEY>"
# → {"token_status":"valid"}
```

### Patch WAJIB di gateway (bug nominal ×100)

API Gojek mengembalikan nominal dalam **sen (×100)** — tanpa patch ini,
pembayaran Rp 1.000 terbaca Rp 100.000 dan **tidak akan pernah match**.

**Patch 1** — tambah helper setelah `app.use(express.json());` di `server.js`:

```js
/**
 * API Gojek merchant-analytics mengembalikan nominal dalam SEN (minor unit, x100).
 * Konversi ke rupiah: 100000 sen → Rp 1000.
 */
function toRupiah(raw) {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return 0;
    return Math.round(n / 100);
}
```

**Patch 2** — endpoint `/transactions` (bagian map):

```js
// SEBELUM:
amount: parseInt(tx.gross_amount || tx.real_gross_amount || 0, 10),
// SESUDAH:
amount: toRupiah(tx.gross_amount || tx.real_gross_amount || 0),
```

**Patch 3** — fungsi `verifyPayment` (loop transaksi):

```js
// SEBELUM:
const txAmount = parseInt(tx.gross_amount || tx.real_gross_amount || tx.amount?.value || tx.amount || 0, 10);
// SESUDAH:
const txAmount = toRupiah(tx.gross_amount || tx.real_gross_amount || tx.amount?.value || tx.amount || 0);
```

### (Opsional) Admin panel web + endpoint push config

Biar setting gak lewat CLI, tambahkan `admin.js` (panel web di `/admin`:
login pakai API_KEY, edit config live tanpa restart, tes QRIS, lihat
transaksi & log) dan endpoint `POST /config` di `server.js` agar QRIS statis
bisa di-push dari dashboard website:

```js
// di server.js — setelah app.use('/admin', adminPanel)
app.post('/config', apiKeyAuth, (req, res) => {
    const { qris_static, merchant_id } = req.body || {};
    const values = {};
    if (typeof qris_static === 'string' && qris_static.trim().length >= 50) values.QRIS_STATIC = qris_static.trim();
    if (typeof merchant_id === 'string' && merchant_id.trim()) values.GOPAY_MERCHANT_ID = merchant_id.trim();
    if (!Object.keys(values).length) {
        return res.status(400).json({ success: false, message: 'Tidak ada nilai valid' });
    }
    // tulis ke .env + update process.env (langsung aktif tanpa restart)
    // ... (implementasi: baca .env, replace baris, tulis balik)
    res.json({ success: true, updated: Object.keys(values) });
});
```

---

## B. Setup per Website (bot4 & bot5)

Tambahkan ke `.env` website:

```env
GOPAY2_BASE_URL=http://127.0.0.1:3005
GOPAY2_API_KEY=<sama-dengan-API_KEY-di-gateway>
```

> Catatan: kalau config di-set lewat dashboard (lihat D), `.env` tidak wajib —
> nilai DB diutamakan, `.env` jadi fallback.

Lalu:

```bash
npx prisma db push   # kolom baru gopayTrxId dll
npm run build && pm2 restart <nama-app>
```

Aktifkan: **Dashboard → QRIS → Provider: "GoPay Merchant 2 (Gateway)" → Simpan**.
Setelah itu semua order (bot Telegram, web shop, topup kuota) otomatis pakai
gateway, dan lunas terdeteksi ≤ 15 detik.

---

## C. Perilaku & Troubleshooting

| Perilaku | Detail |
|---|---|
| Expired QR | Fix **5 menit** (hardcoded gateway) — order auto-clamp 5 mnt, TTL dashboard diabaikan |
| Poll rate | 15 detik per order — aman dari rate-limit GoPay |
| Sesi mati | Order pending sampai expired. Cek `curl .../token-status`. Fix: `node login.js` ulang di folder gateway |
| Dedup | `trx_id` disimpan sebagai `PaymentNotification.externalId` (unique) — anti double-delivery |
| Nominal kecil | Jangan test < Rp 1.000 — beberapa app bank perilakunya aneh |
| Test nominal | Pakai nominal yang belum pernah dipakai — transaksi lama yang sudah di-claim tidak bisa diklaim lagi |

---

## D. Implementasi ke Script Lain — Perubahan Kode

Urutan kerja yang dianjurkan (hasil deploy bot4, terbukti jalan end-to-end):

### D1. Prisma schema — 2 perubahan

```prisma
model TelegramBot {
  // ... kolom lama
  /// GoPay Merchant 2 (gopay-api-gateway)
  gopay2BaseUrl       String? @db.VarChar(255)  // URL gateway, fallback env
  gopay2ApiKey        String? @db.VarChar(191)  // API key, fallback env
  gopay2QrisStatic    String? @db.Text          // arsip; di-push ke gateway saat simpan
}

model PaymentOrder {
  // ... kolom lama
  /// TRX-ID dari gateway — scope klaim pembayaran
  gopayTrxId      String?      @db.VarChar(64)
}
```

Jalankan `npx prisma db push`.

### D2. Client gateway — file baru `src/lib/gopay-merchant2.ts`

Fungsi inti (lihat file asli di bot4 untuk versi lengkap):

```ts
const TIMEOUT_MS = 15_000;

export type Gopay2Cfg = { baseUrl?: string | null; apiKey?: string | null };

function resolve(cfg?: Gopay2Cfg) {
  const baseUrl = (cfg?.baseUrl || process.env.GOPAY2_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
  const apiKey = cfg?.apiKey || process.env.GOPAY2_API_KEY || "";
  return { baseUrl, apiKey };
}

export function gopay2Configured(cfg?: Gopay2Cfg) {
  return Boolean(resolve(cfg).apiKey);
}

async function gopay2Get<T>(path: string, params: Record<string, string | number>, cfg?: Gopay2Cfg): Promise<T> {
  const { baseUrl, apiKey } = resolve(cfg);
  const u = new URL(`${baseUrl}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  u.searchParams.set("api_key", apiKey);
  const res = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || `Gateway error (${res.status})`);
  return json;
}

// Buat QRIS dinamis → { trx_id, qris_code, qris_url, ... }
export async function gopay2CreateQris(amount: number, cfg?: Gopay2Cfg) {
  const json = await gopay2Get<{ data: { trx_id: string; qris_code: string } }>("/create-qris", { amount }, cfg);
  if (!json.data?.qris_code || !json.data?.trx_id) throw new Error("Gateway tidak mengembalikan qris_code/trx_id");
  return json.data;
}

// Cek lunas — match nominal exact, scope trx_id (anti klaim ganda)
export async function gopay2CheckPayment(amount: number, trxId: string, cfg?: Gopay2Cfg) {
  const json = await gopay2Get<{ paid?: boolean; transaction?: unknown }>("/check-payment", { amount, trx_id: trxId }, cfg);
  return { paid: json.paid === true, transaction: json.transaction };
}

// Push QRIS statis ke gateway (endpoint POST /config) — aktif tanpa restart
export async function gopay2PushQrisStatic(qrisStatic: string, cfg?: Gopay2Cfg) {
  const { baseUrl, apiKey } = resolve(cfg);
  const res = await fetch(`${baseUrl}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify({ qris_static: qrisStatic }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success === true, error: json.message };
}
```

### D3. Order creation — pola di SEMUA titik order

Titik order di bot4: `createShopOrder` + `createQuotaTopupOrder` (`src/lib/shop-order.ts`)
dan `createOrder` (`scripts/poll-bot.ts`). Pola yang sama berlaku untuk script lain:

```ts
const GOPAY2_PROVIDER = "gopaymerchant2";
const useGopay2 = bot.qrisProvider === GOPAY2_PROVIDER;
const g2cfg = { baseUrl: bot.gopay2BaseUrl, apiKey: bot.gopay2ApiKey };

// Validasi — provider ini TIDAK butuh qrisStatic, tapi butuh config gateway
if (useGopay2 && !gopay2Configured(g2cfg)) {
  return { ok: false, error: "Gateway GoPay Merchant 2 belum dikonfigurasi." };
}
// ... (unique code nominal tetap jalan seperti biasa — biarkan)

let qrisPayload: string;
let gopayTrxId: string | null = null;
if (useGopay2) {
  const qris = await gopay2CreateQris(amount, g2cfg);   // ← nominal = harga + kode unik
  qrisPayload = qris.qris_code;                          // simpan sebagai qrisPayload biasa
  gopayTrxId = qris.trx_id;                              // WAJIB disimpan — untuk matching
} else {
  qrisPayload = qrisStaticToDynamic(bot.qrisStatic, { amount });  // alur lama
}

// TTL: gateway fix 5 menit
const ttlMinutes = useGopay2 ? 5 : Math.max(1, Math.min(120, bot.qrisTtlMinutes ?? 5));

await prisma.paymentOrder.create({
  data: {
    // ... kolom biasa
    qrisProvider: bot.qrisProvider,
    qrisPayload,
    gopayTrxId,        // ← kolom baru
    expiresAt,
  },
});
```

Poin penting:
- **`qrisPayload` diisi `qris_code` dari gateway** — UI render QR dari kolom ini,
  jadi halaman bayar web & bot tidak perlu diubah sama sekali.
- **`gopayTrxId` wajib disimpan** — dipakai matcher untuk scope klaim.
- Return `provider: "GoPay Merchant 2"` untuk label tampilan.

### D4. Deteksi lunas — matcher (pola `matchBinancePayments`)

Di poller/worker yang sudah ada, tambahkan fungsi ini. Pola: ambil order pending
yang punya `gopayTrxId` → poll `/check-payment` per order → dedup via
`externalId` → claim atomic → settle (reuse semua logika delivery/notif lama).

```ts
let gopay2Busy = false;
let lastGopay2PollMs = 0;
const GOPAY2_POLL_INTERVAL_MS = 15_000;

async function matchGopayMerchant2Payments(bot, botRow) {
  if (gopay2Busy) return;
  if (Date.now() - lastGopay2PollMs < GOPAY2_POLL_INTERVAL_MS) return;
  lastGopay2PollMs = Date.now();
  gopay2Busy = true;
  try {
    const g2cfg = { baseUrl: botRow.gopay2BaseUrl, apiKey: botRow.gopay2ApiKey };
    if (!gopay2Configured(g2cfg)) return;

    // Grace 10 mnt: bayar tepat setelah expire tetap di-match (uang masuk jangan menggantung)
    const graceCutoff = new Date(Date.now() - 10 * 60 * 1000);
    const pending = await prisma.paymentOrder.findMany({
      where: {
        telegramBotId: botRow.id,
        currency: "idr",
        qrisProvider: "gopaymerchant2",
        gopayTrxId: { not: null },
        OR: [
          { status: "pending", expiresAt: { gt: new Date() } },
          { status: "expired", expiresAt: { gte: graceCutoff } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    if (!pending.length) return;

    for (const order of pending) {
      const trxId = order.gopayTrxId;
      if (!trxId || order.amount == null) continue;

      // dedup: trx_id sudah pernah match
      const exists = await prisma.paymentNotification.findUnique({
        where: { externalId: trxId },
        select: { id: true },
      });
      if (exists) continue;

      let paid = false, tx;
      try {
        ({ paid, transaction: tx } = await gopay2CheckPayment(order.amount, trxId, g2cfg));
      } catch (e) {
        console.error("[gopay2] check-payment:", e.message);
        continue; // gateway down → coba siklus berikutnya
      }
      if (!paid) continue;

      const notif = await prisma.paymentNotification.create({
        data: {
          pkg: "gopay.merchant2",
          name: "GoPay Merchant 2",
          text: `Rp ${order.amount} via gateway (${trxId})`,
          amount: order.amount,
          externalId: trxId,          // unique — kunci anti double-delivery
          raw: JSON.stringify({ trxId, transaction: tx ?? {} }),
        },
      });

      // Claim atomik sebelum deliver — anti double-delivery
      const claimed = await prisma.$transaction(async (t) => {
        const updated = await t.paymentOrder.updateMany({
          where: { id: order.id, status: { in: ["pending", "expired"] } },
          data: { status: "processing", notificationId: notif.id, paidAt: new Date() },
        });
        if (!updated.count) return false;
        await t.paymentNotification.update({ where: { id: notif.id }, data: { matched: true } });
        return true;
      });
      if (!claimed) continue;

      console.log("[gopay2] matched", order.invoice, order.amount, trxId);
      await settleOrder(bot, botRow, order);  // reuse settle lama: deliver + notif
    }
  } finally {
    gopay2Busy = false;
  }
}
```

Daftarkan di loop polling utama, setelah matcher lain:

```ts
await expireOrders(running.bot, botRow);
await matchPayments(running.bot, botRow);            // alur notif APK lama — JANGAN diubah
await matchBinancePayments(running.bot, botRow);
await matchGopayMerchant2Payments(running.bot, botRow);  // ← baru
```

> Matcher lama aman tidak bentrok: `matchProvider` hanya kenal
> `dana|nobu|gopay` — order `gopaymerchant2` otomatis di-skip.

### D5. Dashboard — form QRIS

- Enum provider + opsi `"gopaymerchant2"` (dropdown "GoPay Merchant 2 (Gateway)").
- Untuk provider ini: QRIS statis lama **opsional**, muncul 3 field baru
  (URL gateway, API key, QRIS statis GoBiz).
- Validasi: URL wajib format URL; API key min 8 char; QRIS statis GoBiz min 50
  char + CRC valid.
- Saat simpan: simpan ke DB → panggil `gopay2PushQrisStatic()` → tampilkan
  hasil push di pesan sukses ("QRIS statis ter-push ke gateway ✓").
- Provider selain `gopaymerchant2`: field disembunyikan / hidden input agar
  nilai lama tidak hilang.

### D6. Checklist verifikasi

Setelah implementasi, urutan test:

1. `curl "http://GATEWAY/token-status?api_key=KEY"` → `token_status: valid`
2. Dashboard → simpan provider gopaymerchant2 + config → pesan "ter-push ✓"
3. Buat order (bot/web) → DB: `qrisPayload` terisi QR dinamis + `gopayTrxId` terisi
4. Buka halaman bayar → QR tampil, nominal = harga + kode unik
5. Bayar **persis nominalnya** (jangan ubah di app pembayaran)
6. ≤ 15 detik: log `[gopay2] matched <invoice>` + order `paid` + stok terkirim
7. Bayar lagi nominal sama dari order lain → tidak salah klaim (scope trx_id)

---

## E. Referensi file yang berubah di bot4

| File | Perubahan |
|---|---|
| `src/lib/gopay-merchant2.ts` | **Baru** — client gateway (5 fungsi) |
| `prisma/schema.prisma` | +4 kolom (`gopay2BaseUrl`, `gopay2ApiKey`, `gopay2QrisStatic` di TelegramBot; `gopayTrxId` di PaymentOrder) |
| `src/lib/shop-order.ts` | Order web + topup kuota via gateway; `providerLabel` + "GoPay Merchant 2" |
| `scripts/poll-bot.ts` | Order bot via gateway + `matchGopayMerchant2Payments` + signature restart |
| `src/features/telegram/actions/qris.ts` | Provider baru + validasi + push QRIS ke gateway |
| `src/features/telegram/components/qris-form.tsx` | Field config gateway (kondisional) |
| `src/app/(dashboard)/dashboard/page.tsx` | Pass props baru + ringkasan status |
| `src/app/api/public/quota/[token]/topup/route.ts` | Metode qris aktif tanpa qrisStatic |

## F. Catatan desain

- **Kenapa poll, bukan webhook?** Gateway upstream tidak punya webhook — satu2nya
  cara adalah polling `/check-payment`. 15 dtk cukup aman (README gateway
  memperingatkan polling agresif bisa kena limit akun).
- **Kenapa config di DB, bukan .env saja?** Dua site share 1 gateway tapi boleh
  punya API key/QRIS berbeda per bot. DB = fleksibel, .env = fallback default.
- **Kenapa kode unik nominal tetap dipertahankan?** Lapis kedua kalau ada bug
  scope di gateway; juga kompatibel dengan alur notif APK lama.
