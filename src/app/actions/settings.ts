"use server";

import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function getSettings() {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  return {
    secretKey: setting?.secretKey ?? "",
    pin: setting?.pin ?? "",
  };
}

export async function saveSettings(
  formData: FormData
): Promise<ActionResult> {
  const secretKey = formData.get("secretKey")?.toString().trim() ?? "";
  const pin = formData.get("pin")?.toString().trim() ?? "";

  if (!secretKey && !pin) {
    return { ok: false, error: "Secret Key dan PIN tidak boleh kosong" };
  }

  try {
    await prisma.setting.upsert({
      where: { id: 1 },
      update: { secretKey, pin },
      create: { id: 1, secretKey, pin },
    });
    return { ok: true };
  } catch (err) {
    console.error("saveSettings error:", err);
    return { ok: false, error: "Gagal menyimpan pengaturan" };
  }
}
