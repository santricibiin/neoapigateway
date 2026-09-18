/**
 * Paket kuota token (data statis). Dulu tinggal di lib/bandelbanget — dipindah ke
 * sini supaya komponen client tidak menyeret modul upstream (berisi URL provider)
 * ke dalam client JS bundle yang bisa dilihat publik.
 */
export const QUOTA_PACKAGES = {
  "1M": { tokens: 1_000_000, validDays: 7 },
  "5M": { tokens: 5_000_000, validDays: 7 },
  "10M": { tokens: 10_000_000, validDays: 7 },
  "20M": { tokens: 20_000_000, validDays: 7 },
  "50M": { tokens: 50_000_000, validDays: 14 },
  "100M": { tokens: 100_000_000, validDays: 14 },
  "200M": { tokens: 200_000_000, validDays: 21 },
  "500M": { tokens: 500_000_000, validDays: 28 },
  "1B": { tokens: 1_000_000_000, validDays: 28 },
  "2B": { tokens: 2_000_000_000, validDays: 28 },
  "3B": { tokens: 3_000_000_000, validDays: 28 },
  "4B": { tokens: 4_000_000_000, validDays: 28 },
  "5B": { tokens: 5_000_000_000, validDays: 28 },
  "10B": { tokens: 10_000_000_000, validDays: 28 },
} as const;

export type QuotaPackageCode = keyof typeof QUOTA_PACKAGES;
