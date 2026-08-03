"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createResWebSession, destroyResWebSession } from "@/lib/resweb-auth";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

export async function loginResWeb(formData: FormData): Promise<ActionResult & { redirect?: string }> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { ok: false, error: "Email dan password wajib diisi" };
  }

  try {
    const reseller = await prisma.resellerWeb.findUnique({ where: { email } });
    if (!reseller || !reseller.active) {
      return { ok: false, error: "Email atau password salah" };
    }

    const valid = await bcrypt.compare(password, reseller.password);
    if (!valid) {
      return { ok: false, error: "Email atau password salah" };
    }

    createResWebSession(reseller.id);
    console.log("[resweb] session created for", reseller.email, "redirect to /res");
    return { ok: true, redirect: "/res" };
  } catch (err) {
    console.error("[resweb] login error:", err);
    return { ok: false, error: "Terjadi kesalahan, coba lagi" };
  }
}

export async function logoutResWeb() {
  destroyResWebSession();
  redirect("/login/res");
}
