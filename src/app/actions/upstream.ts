"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { modelGateConfig, invalidateModelGate, fetchUpstreamModels } from "@/lib/model-gate";
import { fetchRouterModels, groupByProvider, routerKey } from "@/lib/router-upstream";
import type { ActionResult } from "@/types";

export interface UpstreamModelRow {
  id: string;
  upstreamEnabled: boolean;
  allowed: boolean;
  vision: boolean;
  grade: string;
  input: string[];
  output: string[];
}

export interface RouterModelRow {
  id: string;
  /** Nama tanpa prefix provider, untuk tampilan. */
  label: string;
  allowed: boolean;
  vision: boolean;
  reasoning: boolean;
  contextWindow: number | null;
}

export interface RouterProviderRow {
  provider: string;
  enabled: boolean;
  total: number;
  allowed: number;
  models: RouterModelRow[];
}

export interface UpstreamPageData {
  bandel: UpstreamModelRow[];
  bandelError: string | null;
  router: RouterProviderRow[];
  routerError: string | null;
  routerEnabled: boolean;
  /** ROUTER_KEY belum diisi di env: fitur router tidak bisa dinyalakan. */
  routerConfigured: boolean;
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Data halaman Upstream: model bandel + provider/model 9router. */
export async function loadUpstreamPage(): Promise<UpstreamPageData> {
  requireAdmin();
  const config = await modelGateConfig();
  const [bandelResult, routerResult] = await Promise.allSettled([fetchUpstreamModels(), fetchRouterModels()]);

  const bandel =
    bandelResult.status === "fulfilled"
      ? bandelResult.value
          .map((model) => ({
            id: model.id,
            upstreamEnabled: Boolean(model.enabled),
            allowed: !config.disabled.has(model.id),
            vision: Boolean(model.vision),
            grade: model.grade || "-",
            input: model.modalities?.input || ["text"],
            output: model.modalities?.output || ["text"],
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      : [];

  const router =
    routerResult.status === "fulfilled"
      ? groupByProvider(routerResult.value).map((group) => {
          const models = group.models.map((model) => ({
            id: model.id,
            label: model.id.slice(group.provider.length + 1) || model.id,
            allowed: !config.disabled.has(model.id),
            vision: Boolean(model.capabilities?.vision),
            reasoning: Boolean(model.capabilities?.reasoning),
            contextWindow: toNumber(model.capabilities?.contextWindow ?? model.context_length),
          }));
          return {
            provider: group.provider,
            enabled: config.routerProviders.has(group.provider),
            total: models.length,
            allowed: models.filter((m) => m.allowed).length,
            models,
          };
        })
      : [];

  if (bandelResult.status === "rejected") console.error("loadUpstreamPage bandel:", bandelResult.reason);
  if (routerResult.status === "rejected") console.error("loadUpstreamPage router:", routerResult.reason);

  return {
    bandel,
    bandelError: bandelResult.status === "rejected" ? "Gagal memuat model dari provider" : null,
    router,
    routerError: routerResult.status === "rejected" ? "9router tidak terjangkau di ROUTER_UPSTREAM" : null,
    routerEnabled: Boolean(config.routerEnabled),
    routerConfigured: Boolean(routerKey()),
  };
}

async function saveGate(data: {
  disabledModels?: string;
  routerEnabled?: boolean;
  routerProviders?: string;
}): Promise<ActionResult> {
  try {
    await prisma.setting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    invalidateModelGate();
    revalidatePath("/dashboard/upstream");
    return { ok: true };
  } catch (err) {
    console.error("saveGate error:", err);
    return { ok: false, error: "Gagal menyimpan perubahan" };
  }
}

function validIds(ids: unknown): string[] | null {
  if (!Array.isArray(ids) || ids.length > 5000) return null;
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && !!id.trim() && id.length <= 200))];
}

/** Hidupkan/matikan satu model (bandel maupun router). allowed=false berarti disembunyikan dan diblokir. */
export async function setModelAllowed(id: string, allowed: boolean): Promise<ActionResult> {
  requireAdmin();
  if (typeof id !== "string" || !id.trim() || id.length > 200) {
    return { ok: false, error: "ID model tidak valid" };
  }
  const disabled = new Set((await modelGateConfig()).disabled);
  if (allowed) disabled.delete(id);
  else disabled.add(id);
  return saveGate({ disabledModels: JSON.stringify([...disabled]) });
}

/** Set blocklist model sekaligus (tombol aktifkan/matikan semua). */
export async function setBlockedModels(ids: string[]): Promise<ActionResult> {
  requireAdmin();
  const clean = validIds(ids);
  if (!clean) return { ok: false, error: "Daftar model tidak valid" };
  return saveGate({ disabledModels: JSON.stringify(clean) });
}

/** Master switch upstream 9router. */
export async function setRouterEnabled(enabled: boolean): Promise<ActionResult> {
  requireAdmin();
  if (enabled && !routerKey()) {
    return { ok: false, error: "ROUTER_KEY belum diisi di .env" };
  }
  return saveGate({ routerEnabled: Boolean(enabled) });
}

/** Hidupkan/matikan satu provider 9router. */
export async function setProviderEnabled(provider: string, enabled: boolean): Promise<ActionResult> {
  requireAdmin();
  if (typeof provider !== "string" || !provider.trim() || provider.length > 120) {
    return { ok: false, error: "Provider tidak valid" };
  }
  const allow = new Set((await modelGateConfig()).routerProviders);
  if (enabled) allow.add(provider);
  else allow.delete(provider);
  return saveGate({ routerProviders: JSON.stringify([...allow]) });
}

/** Set allowlist provider sekaligus. */
export async function setEnabledProviders(providers: string[]): Promise<ActionResult> {
  requireAdmin();
  const clean = validIds(providers);
  if (!clean) return { ok: false, error: "Daftar provider tidak valid" };
  return saveGate({ routerProviders: JSON.stringify(clean) });
}
