export function bandelUpstreamBase() {
  return (process.env.BANDEL_UPSTREAM || "https://bandelbanget.xyz").replace(/\/$/, "");
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
