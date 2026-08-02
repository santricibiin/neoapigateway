import { NextResponse } from "next/server";
import { bandelUpstreamBase } from "@/lib/bandel-upstream";
import { fetchResellerData } from "@/lib/bandelbanget";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 300;

interface UpstreamModel {
  id: string;
  enabled: boolean;
  vision: boolean;
  grade: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
}

function numeric(value: unknown, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

interface BrandGroup {
  name: string;
  color: string;
  initial: string;
  activeCount: number;
  totalCount: number;
  vision: boolean;
  status: "active" | "partial" | "inactive";
}

const BRAND_CONFIG: Record<string, { name: string; color: string; initial: string }> = {
  claude: { name: "Claude", color: "#D97757", initial: "C" },
  gpt: { name: "GPT", color: "#10A37F", initial: "G" },
  deepseek: { name: "DeepSeek", color: "#4D6BFE", initial: "D" },
  glm: { name: "GLM", color: "#3B82F6", initial: "Z" },
  kimi: { name: "Kimi", color: "#1A1A1A", initial: "K" },
  mistral: { name: "Mistral", color: "#FF7000", initial: "M" },
  qwen: { name: "Qwen", color: "#6E56CF", initial: "Q" },
  mimo: { name: "MiMo", color: "#F59E0B", initial: "M" },
  hy3: { name: "Hy3", color: "#8B5CF6", initial: "H" },
  llama: { name: "Llama", color: "#0866FF", initial: "L" },
};

function detectBrand(modelId: string): string | null {
  const id = modelId.toLowerCase();
  for (const prefix of Object.keys(BRAND_CONFIG)) {
    if (id.startsWith(prefix)) return prefix;
  }
  return null;
}

export async function GET() {
  try {
    const res = await fetch(`${bandelUpstreamBase()}/v1/models`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const data = await res.json();
    const models = (data.data || []) as UpstreamModel[];

    const setting = await prisma.setting.findUnique({
      where: { id: 1 },
      select: { secretKey: true, pin: true },
    });
    let multipliers: Record<string, number> = {};
    if (setting?.secretKey && setting.pin) {
      try {
        const quota = await fetchResellerData(setting.secretKey, setting.pin);
        const mapped = (quota.modelMultipliers || {}) as Record<string, unknown>;
        multipliers = Object.fromEntries(
          Object.entries(mapped).map(([id, multiplier]) => [id, numeric(multiplier)])
        );
        if (Array.isArray(quota.models)) {
          for (const item of quota.models) {
            const row = (item || {}) as Record<string, unknown>;
            if (typeof row.id === "string" && row.multiplier != null) {
              multipliers[row.id] = numeric(row.multiplier);
            }
          }
        }
      } catch (error) {
        console.error("[public-models] gagal memuat multiplier:", error instanceof Error ? error.message : error);
      }
    }

    const groups = new Map<string, BrandGroup>();

    for (const model of models) {
      const brandKey = detectBrand(model.id);
      if (!brandKey) continue;

      const config = BRAND_CONFIG[brandKey];
      const existing = groups.get(brandKey);

      if (existing) {
        existing.totalCount++;
        if (model.enabled) existing.activeCount++;
        if (model.vision) existing.vision = true;
      } else {
        groups.set(brandKey, {
          name: config.name,
          color: config.color,
          initial: config.initial,
          activeCount: model.enabled ? 1 : 0,
          totalCount: 1,
          vision: model.vision,
          status: model.enabled ? "active" : "inactive",
        });
      }
    }

    const brands = Array.from(groups.values()).map((g) => ({
      ...g,
      status: g.activeCount === 0 ? "inactive" : g.activeCount === g.totalCount ? "active" : "partial",
    }));

    const modelDetails = models
      .map((model) => {
        const brandKey = detectBrand(model.id);
        return {
          id: model.id,
          brand: brandKey ? BRAND_CONFIG[brandKey].name : model.id.startsWith("auto") ? "Auto Router" : "Lainnya",
          enabled: Boolean(model.enabled),
          vision: Boolean(model.vision),
          grade: model.grade || "-",
          multiplier: multipliers[model.id] ?? 1,
          input: model.modalities?.input || ["text"],
          output: model.modalities?.output || ["text"],
        };
      })
      .sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.brand.localeCompare(b.brand) || a.id.localeCompare(b.id));

    const totalActive = modelDetails.filter((model) => model.enabled).length;
    const totalModels = modelDetails.length;

    return NextResponse.json({
      ok: true,
      brands,
      models: modelDetails,
      stats: { totalActive, totalModels, totalBrands: brands.length },
    });
  } catch {
    return NextResponse.json({ ok: false, brands: [], models: [], stats: { totalActive: 0, totalModels: 0, totalBrands: 0 } });
  }
}
