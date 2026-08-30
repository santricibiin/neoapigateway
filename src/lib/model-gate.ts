import { prisma } from "@/lib/prisma";
import { bandelUpstreamBase } from "@/lib/bandel-upstream";
import { routerKey, routerProviderOf } from "@/lib/router-upstream";

export interface UpstreamModel {
  id: string;
  enabled: boolean;
  vision: boolean;
  grade: string;
  modalities?: { input?: string[]; output?: string[] };
}

export interface ModelGateConfig {
  /** ID model yang dimatikan admin (berlaku untuk bandel maupun router). */
  disabled: Set<string>;
  /** Master switch upstream router. */
  routerEnabled: boolean;
  /** Provider router yang diizinkan (allowlist; kosong = tidak ada). */
  routerProviders: Set<string>;
}

/** ponytail: cache in-process, TTL 10s. Cukup untuk 1 instance; kalau nanti multi-node, pindah ke Redis. */
const TTL = 10_000;
let cache: { at: number; config: ModelGateConfig } | null = null;

function parseIds(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export { parseIds as parseDisabledIds };

const EMPTY: ModelGateConfig = { disabled: new Set(), routerEnabled: false, routerProviders: new Set() };

export async function modelGateConfig(): Promise<ModelGateConfig> {
  if (cache && Date.now() - cache.at < TTL) return cache.config;
  try {
    const setting = await prisma.setting.findUnique({
      where: { id: 1 },
      select: { disabledModels: true, routerEnabled: true, routerProviders: true },
    });
    cache = {
      at: Date.now(),
      config: {
        disabled: parseIds(setting?.disabledModels),
        routerEnabled: Boolean(setting?.routerEnabled) && Boolean(routerKey()),
        routerProviders: parseIds(setting?.routerProviders),
      },
    };
  } catch {
    // DB down: jangan buka model yang sudah dimatikan, dan jangan aktifkan router.
    if (!cache) cache = { at: Date.now(), config: EMPTY };
  }
  return cache.config;
}

/** ID model yang dimatikan admin. */
export async function disabledModelIds(): Promise<Set<string>> {
  return (await modelGateConfig()).disabled;
}

export function invalidateModelGate() {
  cache = null;
}

/** Model router boleh dipakai: master switch on, provider di allowlist, ID tidak diblokir. */
export function routerModelAllowed(id: string, config: ModelGateConfig): boolean {
  if (!config.routerEnabled) return false;
  const provider = routerProviderOf(id);
  if (!provider || !config.routerProviders.has(provider)) return false;
  return !config.disabled.has(id);
}

export type ModelTarget =
  | { kind: "bandel" }
  | { kind: "router" }
  | { kind: "blocked" };

/**
 * Tentukan tujuan sebuah ID model.
 * ID ber-prefix provider (`cf/...`) dianggap milik router; sisanya milik bandel.
 * Tanpa ID (mis. endpoint non-inference), default bandel.
 */
export function resolveModelTarget(id: string | null | undefined, config: ModelGateConfig): ModelTarget {
  if (!id) return { kind: "bandel" };
  if (config.disabled.has(id)) return { kind: "blocked" };
  if (routerProviderOf(id)) return routerModelAllowed(id, config) ? { kind: "router" } : { kind: "blocked" };
  return { kind: "bandel" };
}

/** Buang entri model yang diblokir dari payload list gaya OpenAI. Mutasi payload di tempat. */
export function filterModelListPayload(payload: unknown, blocked: Set<string>): unknown {
  const root = payload as { data?: unknown } | null;
  if (root && Array.isArray(root.data)) {
    root.data = root.data.filter((model) => {
      const id = (model as { id?: unknown } | null)?.id;
      return !(typeof id === "string" && blocked.has(id));
    });
  }
  return payload;
}

/** Ambil field `model` dari body request JSON. null kalau tidak ada / body bukan JSON. */
export function modelFromRequestBody(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    const model = (parsed as { model?: unknown } | null)?.model;
    return typeof model === "string" && model ? model : null;
  } catch {
    return null;
  }
}

/** Daftar model mentah dari upstream bandel. */
export async function fetchUpstreamModels(): Promise<UpstreamModel[]> {
  const res = await fetch(`${bandelUpstreamBase()}/v1/models`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  const data = await res.json();
  return (data.data || []) as UpstreamModel[];
}

/** Daftar model bandel tanpa yang dimatikan admin. */
export async function fetchAllowedModels(): Promise<UpstreamModel[]> {
  const [models, config] = await Promise.all([fetchUpstreamModels(), modelGateConfig()]);
  return models.filter((model) => !config.disabled.has(model.id));
}
