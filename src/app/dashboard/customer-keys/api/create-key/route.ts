import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { fetchResellerKeys, formatBandelDelivery, provisionCustomerKey, QUOTA_PACKAGES } from "@/lib/bandelbanget";
import { publicApiBase, publicV1Base } from "@/lib/bandel-upstream";

export const dynamic = "force-dynamic";

/** Buat customer key baru via provision bandel (admin). */
export async function POST(req: Request) {
  if (!getSession()) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const code = String((body as { packageCode?: unknown })?.packageCode ?? "");
  const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
  if (!pack) {
    return NextResponse.json({ ok: false, error: "Pilih paket token yang valid" }, { status: 400 });
  }

  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { secretKey: true, pin: true },
  });
  if (!setting?.secretKey) {
    return NextResponse.json({ ok: false, error: "Secret Key reseller belum diatur" }, { status: 400 });
  }

  // Cek kuota reseller upstream cukup sebelum provision.
  try {
    const keys = await fetchResellerKeys(setting.secretKey);
    if (typeof keys.resellerQuota === "number" && keys.resellerQuota < pack.tokens) {
      return NextResponse.json({ ok: false, error: "Stok kuota reseller tidak cukup. Hubungi penyedia." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Gagal memverifikasi stok kuota" },
      { status: 502 }
    );
  }

  try {
    const created = await provisionCustomerKey(setting.secretKey, pack.tokens, pack.validDays, setting.pin || undefined);
    const secret = created.secretToken || "";
    const dashboard = secret ? `${publicApiBase()}/quota/${secret}` : created.dashboardUrl || "";

    return NextResponse.json({
      ok: true,
      code,
      tokens: pack.tokens,
      validDays: pack.validDays,
      name: created.name || null,
      pin: created.pin || "111111",
      apiKey: created.apiKey || null,
      keyMasked: created.keyMasked || null,
      secretToken: secret || null,
      dashboardUrl: dashboard,
      apiBase: publicV1Base(),
      deliveryText: formatBandelDelivery(created, code),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Gagal membuat key" },
      { status: 502 }
    );
  }
}
