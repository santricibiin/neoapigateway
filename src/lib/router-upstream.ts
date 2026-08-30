/** Klien 9router. Murni HTTP + helper tanpa DB, supaya bebas dari import siklik dengan model-gate. */

export interface RouterModel {
  id: string;
  object?: string;
  owned_by?: string;
  context_length?: number;
  max_completion_tokens?: number;
  capabilities?: {
    vision?: boolean;
    search?: boolean;
    tools?: boolean;
    reasoning?: boolean;
    contextWindow?: number;
    maxOutput?: number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export function routerBase() {
  return (process.env.ROUTER_UPSTREAM || "http://127.0.0.1:20128").replace(/\/$/, "");
}

/** Key milik kita sendiri untuk memanggil 9router. Kosong = fitur router mati. */
export function routerKey() {
  return (process.env.ROUTER_KEY || "").trim();
}

/**
 * Provider dari ID model router, yaitu segmen sebelum `/` pertama.
 * `cf/@cf/meta/llama-3.2-1b-instruct` -> `cf`. ID tanpa `/` (model bandel) -> null.
 */
export function routerProviderOf(id: string | null | undefined): string | null {
  if (!id) return null;
  const slash = id.indexOf("/");
  if (slash < 1 || slash === id.length - 1) return null;
  return id.slice(0, slash);
}

export async function fetchRouterModels(): Promise<RouterModel[]> {
  const key = routerKey();
  const res = await fetch(`${routerBase()}/v1/models`, {
    cache: "no-store",
    headers: key ? { Accept: "application/json", Authorization: `Bearer ${key}` } : { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Router ${res.status}`);
  const data = await res.json();
  return ((data?.data || []) as RouterModel[]).filter((model) => typeof model?.id === "string");
}

export interface RouterProviderGroup {
  provider: string;
  models: RouterModel[];
}

/** Kelompokkan model router per provider, urut nama provider. */
export function groupByProvider(models: RouterModel[]): RouterProviderGroup[] {
  const groups = new Map<string, RouterModel[]>();
  for (const model of models) {
    const provider = routerProviderOf(model.id) || String(model.owned_by || "lainnya");
    const bucket = groups.get(provider);
    if (bucket) bucket.push(model);
    else groups.set(provider, [model]);
  }
  return [...groups.entries()]
    .map(([provider, list]) => ({ provider, models: list.sort((a, b) => a.id.localeCompare(b.id)) }))
    .sort((a, b) => a.provider.localeCompare(b.provider));
}
