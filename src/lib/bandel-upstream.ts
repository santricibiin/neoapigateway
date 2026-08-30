export function bandelUpstreamBase() {
  return (process.env.BANDEL_UPSTREAM || "https://bandelbanget.xyz").replace(/\/$/, "");
}

export function vipUpstreamBase() {
  return (process.env.VIP_UPSTREAM || "https://vip.bandelbanget.xyz").replace(/\/$/, "");
}

/** Host yang request-nya dialihkan ke upstream VIP. Kosong = fitur mati. */
export function vipHost() {
  return (process.env.VIP_HOST || "").trim().toLowerCase();
}

/** Pilih upstream berdasarkan Host request; fallback X-Forwarded-Host. */
export function upstreamBaseFor(request: Request) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim().toLowerCase();
  return vipHost() && host === vipHost() ? vipUpstreamBase() : bandelUpstreamBase();
}

export function publicApiBase() {
  return (process.env.PUBLIC_API_BASE || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function publicV1Base() {
  return `${publicApiBase()}/v1`;
}

export function publicBrandName() {
  return (process.env.PUBLIC_BRAND_NAME || "Neo API Gateway").trim();
}
