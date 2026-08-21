export function maskInvoice(invoice: string) {
  if (invoice.length <= 6) return "*".repeat(invoice.length);
  return `${invoice.slice(0, 3)}${"*".repeat(invoice.length - 6)}${invoice.slice(-3)}`;
}
