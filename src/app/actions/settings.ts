"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyQrisCrc } from "@/lib/qris";
import type { ActionResult } from "@/types";

const VALID_PROVIDERS = ["none", "dana", "nobu"] as const;

export async function getSettings() {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  return {
    secretKey: setting?.secretKey ?? "",
    pin: setting?.pin ?? "",
    qrisProvider: setting?.qrisProvider ?? "none",
    qrisStatic: setting?.qrisStatic ?? "",
    qrisTtlMinutes: setting?.qrisTtlMinutes ?? 5,
    forwarderSecret: setting?.forwarderSecret ?? "",
    uniqueCodeEnabled: setting?.uniqueCodeEnabled ?? true,
  };
}

export async function saveSettings(
  formData: FormData
): Promise<ActionResult> {
  const secretKey = formData.get("secretKey")?.toString().trim() ?? "";
  const pin = formData.get("pin")?.toString().trim() ?? "";
  const qrisProvider = formData.get("qrisProvider")?.toString().trim() ?? "none";
  const qrisStatic = formData.get("qrisStatic")?.toString().trim() ?? "";
  const qrisTtlMinutes = Number(formData.get("qrisTtlMinutes") ?? "5");
  const forwarderSecret = formData.get("forwarderSecret")?.toString().trim() ?? "";
  const uniqueCodeEnabled = formData.get("uniqueCodeEnabled") === "on";

  if (!secretKey && !pin) {
    return { ok: false, error: "Secret Key dan PIN tidak boleh kosong" };
  }

  if (!VALID_PROVIDERS.includes(qrisProvider as (typeof VALID_PROVIDERS)[number])) {
    return { ok: false, error: "Provider QRIS tidak valid" };
  }

  if (qrisProvider !== "none" && !qrisStatic) {
    return { ok: false, error: "QRIS statis wajib diisi jika provider aktif" };
  }

  if (qrisStatic && !verifyQrisCrc(qrisStatic)) {
    return { ok: false, error: "QRIS statis tidak valid (CRC gagal)" };
  }

  if (!Number.isInteger(qrisTtlMinutes) || qrisTtlMinutes < 1 || qrisTtlMinutes > 120) {
    return { ok: false, error: "Masa berlaku QRIS harus 1-120 menit" };
  }

  try {
    await prisma.setting.upsert({
      where: { id: 1 },
      update: { secretKey, pin, qrisProvider, qrisStatic, qrisTtlMinutes, forwarderSecret, uniqueCodeEnabled },
      create: { id: 1, secretKey, pin, qrisProvider, qrisStatic, qrisTtlMinutes, forwarderSecret, uniqueCodeEnabled },
    });
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (err) {
    console.error("saveSettings error:", err);
    return { ok: false, error: "Gagal menyimpan pengaturan" };
  }
}
