import { NextResponse } from "next/server";
import { getSettings } from "@/app/actions/settings";
import {
  fetchResellerData,
  fetchResellerKeys,
  fetchResellerActivity,
} from "@/lib/bandelbanget";

export async function POST() {
  const settings = await getSettings();

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
