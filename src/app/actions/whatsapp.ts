"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/types";

export async function getWaSettings() {
  requireAdmin();
  const s = await prisma.setting.findUnique({ where: { id: 1 } });
  return {
    waEnabled: s?.waEnabled ?? false,
    waPhoneNumber: s?.waPhoneNumber ?? "",
  };
}

export async function saveWaSettings(formData: FormData): Promise<ActionResult> {
  requireAdmin();

  const waEnabled = formData.get("waEnabled") === "on";
  const waPhoneNumber = String(formData.get("waPhoneNumber") ?? "").replace(/[^0-9]/g, "");

  if (waEnabled && !waPhoneNumber) {
    return { ok: false, error: "Nomor WhatsApp wajib diisi saat bot diaktifkan" };
  }
  if (waPhoneNumber && !/^62[0-9]{8,13}$/.test(waPhoneNumber)) {
    return { ok: false, error: "Nomor harus format 62xxxxxxxxxx (tanpa + dan 0 di depan)" };
  }

  await prisma.setting.update({
    where: { id: 1 },
    data: { waEnabled, waPhoneNumber: waPhoneNumber || null },
  });

  revalidatePath("/dashboard/whatsapp");
  return { ok: true };
}

/** Admin minta pairing code: tandai request, runner memproses dan menulis hasil ke waPairingCode. */
export async function requestWaPairingCode(): Promise<ActionResult> {
  requireAdmin();
  const s = await prisma.setting.findUnique({ where: { id: 1 }, select: { waEnabled: true, waPhoneNumber: true } });
  if (!s?.waEnabled || !s.waPhoneNumber) {
    return { ok: false, error: "Aktifkan bot dan isi nomor WhatsApp dulu" };
  }
  await prisma.setting.update({
    where: { id: 1 },
    data: { waPairingRequest: new Date(), waPairingCode: null },
  });
  return { ok: true };
}

/** Admin batalkan pairing / bersihkan kode. */
export async function clearWaPairing(): Promise<ActionResult> {
  requireAdmin();
  await prisma.setting.update({
    where: { id: 1 },
    data: { waPairingCode: null, waPairingRequest: null },
  });
  return { ok: true };
}
