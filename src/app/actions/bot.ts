"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_MESSAGES } from "@/lib/bot-messages";
import type { ActionResult } from "@/types";

export async function getBotSettings() {
  requireAdmin();
  const s = await prisma.setting.findUnique({ where: { id: 1 } });
  return {
    botEnabled: s?.botEnabled ?? false,
    telegramBotToken: s?.telegramBotToken ?? "",
    notifyChannelId: s?.notifyChannelId ?? "",
    forceJoinOn: s?.forceJoinOn ?? false,
    forceJoinLink: s?.forceJoinLink ?? "",
    forceJoinChatId: s?.forceJoinChatId ?? "",
    welcomeText: s?.welcomeText ?? DEFAULT_MESSAGES.welcomeText,
    categoryText: s?.categoryText ?? DEFAULT_MESSAGES.categoryText,
    productListText: s?.productListText ?? DEFAULT_MESSAGES.productListText,
    productDetailText: s?.productDetailText ?? DEFAULT_MESSAGES.productDetailText,
    qrisInvoiceText: s?.qrisInvoiceText ?? DEFAULT_MESSAGES.qrisInvoiceText,
    paymentSuccessText: s?.paymentSuccessText ?? DEFAULT_MESSAGES.paymentSuccessText,
    thankYouText: s?.thankYouText ?? DEFAULT_MESSAGES.thankYouText,
    qrisExpiredText: s?.qrisExpiredText ?? DEFAULT_MESSAGES.qrisExpiredText,
  };
}

export async function saveBotSettings(formData: FormData): Promise<ActionResult> {
  requireAdmin();

  const botEnabled = formData.get("botEnabled") === "on";
  const telegramBotToken = String(formData.get("telegramBotToken") ?? "").trim();
  const notifyChannelId = String(formData.get("notifyChannelId") ?? "").trim();
  const forceJoinOn = formData.get("forceJoinOn") === "on";
  const forceJoinLink = String(formData.get("forceJoinLink") ?? "").trim();
  const forceJoinChatId = String(formData.get("forceJoinChatId") ?? "").trim();

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const welcomeText = text("welcomeText");
  const categoryText = text("categoryText");
  const productListText = text("productListText");
  const productDetailText = text("productDetailText");
  const qrisInvoiceText = text("qrisInvoiceText");
  const paymentSuccessText = text("paymentSuccessText");
  const thankYouText = text("thankYouText");
  const qrisExpiredText = text("qrisExpiredText");

  const existing = await prisma.setting.findUnique({ where: { id: 1 } });
  const finalToken = telegramBotToken || existing?.telegramBotToken || "";

  if (botEnabled && !finalToken) {
    return { ok: false, error: "Token bot wajib diisi saat bot diaktifkan" };
  }
  if (finalToken && !/^\d+:[A-Za-z0-9_-]+$/.test(finalToken)) {
    return { ok: false, error: "Format token Telegram tidak valid (123456:ABC-DEF...)" };
  }
  if (!categoryText.includes("{kategori}")) {
    return { ok: false, error: "Template kategori wajib memuat {kategori}" };
  }
  if (!productListText.includes("{produk}")) {
    return { ok: false, error: "Template list produk wajib memuat {produk}" };
  }
  if (!qrisInvoiceText.includes("{invoice}")) {
    return { ok: false, error: "Template invoice wajib memuat {invoice}" };
  }
  if (!paymentSuccessText.includes("{produk_items}")) {
    return { ok: false, error: "Template pembayaran sukses wajib memuat {produk_items}" };
  }
  if (forceJoinOn && (!forceJoinLink || !forceJoinChatId)) {
    return { ok: false, error: "Link & Chat ID channel wajib diisi saat Force Join aktif" };
  }

  try {
    await prisma.setting.upsert({
      where: { id: 1 },
      update: {
        botEnabled,
        telegramBotToken: finalToken,
        notifyChannelId: notifyChannelId || null,
        forceJoinOn,
        forceJoinLink: forceJoinLink || null,
        forceJoinChatId: forceJoinChatId || null,
        welcomeText,
        categoryText,
        productListText,
        productDetailText,
        qrisInvoiceText,
        paymentSuccessText,
        thankYouText,
        qrisExpiredText,
      },
      create: {
        id: 1,
        botEnabled,
        telegramBotToken: finalToken,
        notifyChannelId: notifyChannelId || null,
        forceJoinOn,
        forceJoinLink: forceJoinLink || null,
        forceJoinChatId: forceJoinChatId || null,
        welcomeText,
        categoryText,
        productListText,
        productDetailText,
        qrisInvoiceText,
        paymentSuccessText,
        thankYouText,
        qrisExpiredText,
      },
    });
    revalidatePath("/dashboard/bot");
    return { ok: true };
  } catch (err) {
    console.error("saveBotSettings error:", err);
    return { ok: false, error: "Gagal menyimpan pengaturan bot" };
  }
}
