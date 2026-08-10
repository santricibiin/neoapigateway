import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/reseller-api-auth";
import { bandelUpstreamBase } from "@/lib/bandel-upstream";

export const dynamic = "force-dynamic";

interface UpstreamModel {
  id: string;
  enabled: boolean;
  vision: boolean;
  grade: string;
  modalities?: { input?: string[]; output?: string[] };
}

export async function GET(req: Request) {
  const reseller = await authenticateApiKey(req);
  if (!reseller) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${bandelUpstreamBase()}/v1/models`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);

    const data = await res.json();
    const models = ((data.data || []) as UpstreamModel[]).map((m) => ({
      id: m.id,
      enabled: Boolean(m.enabled),
      vision: Boolean(m.vision),
      grade: m.grade || "-",
      input: m.modalities?.input || ["text"],
      output: m.modalities?.output || ["text"],
    }));

    return NextResponse.json({
      ok: true,
      total: models.length,
      active: models.filter((m) => m.enabled).length,
      models,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Gagal memuat model" }, { status: 502 });
  }
}
