import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/reseller-api-auth";
import { fetchAllowedModels } from "@/lib/model-gate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const reseller = await authenticateApiKey(req);
  if (!reseller) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const models = (await fetchAllowedModels()).map((m) => ({
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
