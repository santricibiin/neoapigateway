import { NextResponse } from "next/server";
import { getSettingsRaw } from "@/app/actions/settings";
import { getSession } from "@/lib/auth";
import {
  fetchResellerData,
  fetchResellerKeys,
  fetchResellerActivity,
} from "@/lib/bandelbanget";

export async function POST() {
  if (!getSession()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettingsRaw();

  if (!settings.secretKey || !settings.pin) {
    return NextResponse.json({
      ok: false,
      error: "Secret Key dan PIN belum diatur",
    });
  }

  try {
    const data = await fetchResellerData(settings.secretKey, settings.pin);
    let keys: Awaited<ReturnType<typeof fetchResellerKeys>>["keys"] = [];
    let activity: Awaited<ReturnType<typeof fetchResellerActivity>> = [];

    try {
      const keysRes = await fetchResellerKeys(settings.secretKey);
      keys = keysRes.keys;
    } catch {}

    try {
      activity = await fetchResellerActivity(settings.secretKey);
    } catch {}

    return NextResponse.json({ ok: true, data, keys, activity });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Gagal mengambil data",
    });
  }
}
