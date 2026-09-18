/**
 * Format angka token besar biar rapi & jelas.
 * Contoh: 1B · 500M · 1.05B · 1.5B · 2.5M · 750K · 1.250
 * Aturan: maks 2 desimal, buang nol ekor (1.50 → 1.5B).
 */
const fmt = (n: number, div: number, suffix: string) => {
  const v = n / div;
  const s = v.toFixed(2).replace(/\.?0+$/, "");
  return `${s}${suffix}`;
};
export function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return fmt(value, 1_000_000_000, "B");
  if (value >= 1_000_000) return fmt(value, 1_000_000, "M");
  // K: di bawah 10K tampilkan angka penuh (1.250) biar tidak jadi "1.25K" aneh.
  if (value >= 10_000) return fmt(value, 1_000, "K");
  return value.toLocaleString("id-ID");
}
