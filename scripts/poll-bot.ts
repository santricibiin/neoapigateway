import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Markup, type Telegraf as TelegrafType } from "telegraf";
import { createBot } from "../src/features/telegram/lib/bot";
import { DEFAULT_FX, DEFAULT_MESSAGES } from "../src/lib/bot-messages";
import { maskInvoice } from "../src/lib/mask-invoice";
import { QUOTA_PACKAGES, fetchResellerKeys } from "../src/lib/bandelbanget";
import { createBotOrder } from "../src/lib/shop-order";
import { matchGopayMerchant2Payments } from "../src/lib/gopay-merchant2";

const prisma = new PrismaClient();
const idr = new Intl.NumberFormat("id-ID");

let running: { signature: string; bot: TelegrafType } | null = null;
let syncing = false;

function jakartaNow() {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

async function safeSend(bot: TelegrafType, chatId: string | number, text: string) {
  try {
    await bot.telegram.sendMessage(chatId, text, { disable_web_page_preview: true } as never);
  } catch (e) {
    console.error("[notify] fail →", chatId, e instanceof Error ? e.message : e);
  }
}

function cps(s: string) {
  return Array.from(s);
}

function maskName(raw?: string | null) {
  const chars = cps((raw || "").trim());
  if (!chars.length) return "••••";
  const simple = /^[\w\s.'-]+$/u.test(chars.join(""));
  if (!simple) return "••••••";
  if (chars.length === 1) return `${chars[0]}•`;
  if (chars.length === 2) return `${chars[0]}•`;
  return `${chars[0]}${"•".repeat(Math.min(chars.length - 2, 5))}${chars[chars.length - 1]}`;
}

function maskUsername(raw?: string | null) {
  const t = (raw || "").trim().replace(/^@/, "");
  if (!t) return "—";
  return `@${maskName(t)}`;
}

function maskTgId(raw: string) {
  const t = raw.trim();
  if (t.length <= 4) return "••••";
  return `${t.slice(0, 2)}••••${t.slice(-2)}`;
}

function escapeMd(value: string) {
  return value.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

function applyTpl(template: string, vars: Record<string, string>, rawKeys: string[] = []) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    const v = rawKeys.includes(key) ? value : escapeMd(value);
    out = out.replaceAll(`{${key}}`, v);
  }
  return out;
}

function stripMd(value: string) {
  return value.replace(/\\([_*\[\]()~`>#+\-=|{}.!\\])/g, "$1");
}

async function sendMd(bot: TelegrafType, chatId: number | string, text: string, extra?: object) {
  try {
    await bot.telegram.sendMessage(chatId, text, {
      parse_mode: "MarkdownV2",
      ...(extra as object),
    } as never);
  } catch {
    await bot.telegram.sendMessage(chatId, stripMd(text), (extra as object) ?? {}).catch(() => null);
  }
}

async function flashSticker(
  bot: TelegrafType,
  chatId: number,
  stickerId: string | null | undefined,
  ms = DEFAULT_FX.flashMs
) {
  if (!stickerId) return;
  try {
    const sent = await bot.telegram.sendSticker(chatId, stickerId);
    await new Promise((r) => setTimeout(r, ms));
    await bot.telegram.deleteMessage(chatId, sent.message_id).catch(() => null);
  } catch (e) {
    console.error("[fx] purchase sticker fail:", e instanceof Error ? e.message : e);
  }
}

async function resolveProductStock(
  product: { stockMode: string; sku: string | null; model: string; stock: number },
  setting: { secretKey: string | null }
): Promise<{ stock: number; stockLabel: string; stockMode: "counted" | "external" }> {
  if (product.stockMode !== "external") {
    return { stock: product.stock, stockLabel: String(product.stock), stockMode: "counted" };
  }
  const code = (product.sku || product.model || "").toUpperCase();
  const pack = QUOTA_PACKAGES[code as keyof typeof QUOTA_PACKAGES];
  if (!pack || !setting.secretKey) {
    return { stock: 0, stockLabel: "Habis", stockMode: "external" };
  }
  try {
    const keys = await fetchResellerKeys(setting.secretKey);
    const quota = Number(keys.resellerQuota ?? 0);
    const ok = quota >= pack.tokens;
    return { stock: ok ? 1 : 0, stockLabel: ok ? "Tersedia" : "Habis", stockMode: "external" };
  } catch (e) {
    console.error("[bandel] quota check fail:", e instanceof Error ? e.message : e);
    return { stock: 0, stockLabel: "Habis", stockMode: "external" };
  }
}

async function notifyChannelSale(
  bot: TelegrafType,
  order: {
    invoice: string;
    productName: string;
    productSku: string | null;
    qty: number;
    amount: number;
    telegramUserId: string | null;
  },
  channel: string
) {
  const text = [
    `✨ TRANSAKSI SUKSES ✨`,
    ``,
    `┏━━━━━━━━━━━━━━━━━━┓`,
    `┃   💎 ORDER LUNAS   ┃`,
    `┗━━━━━━━━━━━━━━━━━━┛`,
    ``,
    `🧾 Invoice  · ${maskInvoice(order.invoice)}`,
    `📦 Produk   · ${order.productName}`,
    `🏷 Kode     · ${order.productSku || "—"}`,
    `🔢 Jumlah   · ×${order.qty}`,
    `💰 Total    · Rp ${idr.format(order.amount)}`,
    ``,
    `👤 Pembeli  · ${maskTgId(order.telegramUserId || "web")}`,
    `⏰ Waktu    · ${jakartaNow()} WIB`,
    ``,
    `✅ Pesanan terkirim`,
  ].join("\n");
  await safeSend(bot, channel, text);
}

type SettingRow = {
  telegramBotToken: string | null;
  botEnabled: boolean;
  welcomeText: string | null;
  categoryText: string | null;
  productListText: string | null;
  productDetailText: string | null;
  qrisInvoiceText: string | null;
  paymentSuccessText: string | null;
  thankYouText: string | null;
  qrisExpiredText: string | null;
  notifyChannelId: string | null;
  forceJoinOn: boolean;
  forceJoinLink: string | null;
  forceJoinChatId: string | null;
};

async function getSetting(): Promise<SettingRow | null> {
  const s = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!s) return null;
  return {
    telegramBotToken: s.telegramBotToken,
    botEnabled: s.botEnabled,
    welcomeText: s.welcomeText,
    categoryText: s.categoryText,
    productListText: s.productListText,
    productDetailText: s.productDetailText,
    qrisInvoiceText: s.qrisInvoiceText,
    paymentSuccessText: s.paymentSuccessText,
    thankYouText: s.thankYouText,
    qrisExpiredText: s.qrisExpiredText,
    notifyChannelId: s.notifyChannelId,
    forceJoinOn: s.forceJoinOn,
    forceJoinLink: s.forceJoinLink,
    forceJoinChatId: s.forceJoinChatId,
  };
}

async function expireBotOrders(bot: TelegrafType, setting: SettingRow) {
  const expired = await prisma.paymentOrder.findMany({
    where: { telegramUserId: { not: null }, status: "pending", expiresAt: { lte: new Date() } },
    take: 20,
  });
  for (const order of expired) {
    // Claim atomik: kalau webhook menandai paid duluan, jangan kirim "kedaluwarsa"
    const claimed = await prisma.paymentOrder.updateMany({
      where: { id: order.id, status: "pending" },
      data: { status: "expired" },
    });
    if (!claimed.count) continue;
    if (order.qrisMessageId && order.chatId) {
      await bot.telegram.deleteMessage(Number(order.chatId), order.qrisMessageId).catch(() => null);
    }
    const text = applyTpl(setting.qrisExpiredText || DEFAULT_MESSAGES.qrisExpiredText, {
      invoice: order.invoice,
      total: `Rp ${idr.format(order.amount)}`,
      nama: order.productName,
    });
    await sendMd(
      bot,
      Number(order.chatId),
      text,
      Markup.inlineKeyboard([[Markup.button.callback("🏷 Kembali ke kategori", "cats:1")]])
    );
    console.log("[order] expired", order.invoice);
  }
}

async function notifyPaidBotOrders(bot: TelegrafType, setting: SettingRow) {
  const paid = await prisma.paymentOrder.findMany({
    where: { telegramUserId: { not: null }, status: "paid", telegramNotifiedAt: null },
    take: 20,
  });
  for (const order of paid) {
    const claimed = await prisma.paymentOrder.updateMany({
      where: { id: order.id, status: "paid", telegramNotifiedAt: null },
      data: { telegramNotifiedAt: new Date() },
    });
    if (!claimed.count) continue;

    if (order.qrisMessageId && order.chatId) {
      await bot.telegram.deleteMessage(Number(order.chatId), order.qrisMessageId).catch(() => null);
    }

    const delivered = order.delivered || `${order.qty}x ${order.productName}`;
    const stockBlock = "```\n" + delivered + "\n```";
    const successText = applyTpl(
      setting.paymentSuccessText || DEFAULT_MESSAGES.paymentSuccessText,
      {
        invoice: maskInvoice(order.invoice),
        nama: order.productName,
        kode: order.productSku || "—",
        jumlah: String(order.qty),
        total: `Rp ${idr.format(order.amount)}`,
        produk_items: stockBlock,
      },
      ["produk_items"]
    );
    await sendMd(bot, Number(order.chatId), successText);

    await flashSticker(bot, Number(order.chatId), DEFAULT_FX.purchaseSticker);

    const thanks = applyTpl(setting.thankYouText || DEFAULT_MESSAGES.thankYouText, {
      nama: order.productName,
      invoice: maskInvoice(order.invoice),
      total: `Rp ${idr.format(order.amount)}`,
      jumlah: String(order.qty),
    });
    await sendMd(
      bot,
      Number(order.chatId),
      thanks,
      Markup.inlineKeyboard([[Markup.button.callback("🏷 Kembali ke kategori", "cats:1")]])
    );

    const channel = (setting.notifyChannelId || process.env.NOTIFY_CHANNEL_ID || "").trim();
    if (channel) await notifyChannelSale(bot, order, channel);

    console.log("[order] paid", order.invoice, "amount", order.amount);
  }
}

async function failStuckBotOrders(bot: TelegrafType) {
  const stuck = await prisma.paymentOrder.findMany({
    where: {
      telegramUserId: { not: null },
      status: { in: ["processing", "delivering"] },
      updatedAt: { lte: new Date(Date.now() - 5 * 60_000) },
    },
    take: 20,
  });
  for (const order of stuck) {
    const claimed = await prisma.paymentOrder.updateMany({
      where: { id: order.id, status: { in: ["processing", "delivering"] } },
      data: { status: "failed" },
    });
    if (!claimed.count) continue;
    if (order.qrisMessageId && order.chatId) {
      await bot.telegram.deleteMessage(Number(order.chatId), order.qrisMessageId).catch(() => null);
    }
    await sendMd(
      bot,
      Number(order.chatId),
      applyTpl(
        "Pembayaran diterima, namun pengiriman gagal\\.\nInvoice · `{invoice}`\nHubungi admin untuk bantuan\\.",
        { invoice: order.invoice }
      ),
      Markup.inlineKeyboard([[Markup.button.callback("Kembali ke kategori", "cats:1")]])
    );
    console.log("[order] failed (stuck processing)", order.invoice);
  }
}

async function syncBot() {
  if (syncing) return;
  syncing = true;
  try {
    const setting = await getSetting();
    const token = setting?.telegramBotToken?.trim() || "";

    if (!setting?.botEnabled || !token) {
      if (running) {
        running.bot.stop("disabled");
        console.log("Bot dimatikan");
        running = null;
      }
      return;
    }

    const forceJoin =
      setting.forceJoinOn && setting.forceJoinLink && setting.forceJoinChatId
        ? { on: true, link: setting.forceJoinLink, chatId: setting.forceJoinChatId }
        : undefined;

    const signature = [
      token,
      setting.welcomeText,
      setting.categoryText,
      setting.productListText,
      setting.productDetailText,
      setting.qrisInvoiceText,
      setting.paymentSuccessText,
      setting.thankYouText,
      setting.qrisExpiredText,
      setting.notifyChannelId,
      setting.forceJoinOn,
      setting.forceJoinLink,
      setting.forceJoinChatId,
    ].join("\0");

    if (running?.signature === signature) {
      await expireBotOrders(running.bot, setting);
      await notifyPaidBotOrders(running.bot, setting);
      await failStuckBotOrders(running.bot);
      // Order gopaymerchant2 bot Telegram: poll gateway (guard interval internal)
      await matchGopayMerchant2Payments().catch((e) => console.error("[gopay2] poll:", e));
      return;
    }

    if (running) running.bot.stop("replaced");

    const bot = createBot(
      token,
      {
        welcomeText: setting.welcomeText || DEFAULT_MESSAGES.welcomeText,
        categoryText: setting.categoryText || DEFAULT_MESSAGES.categoryText,
        productListText: setting.productListText || DEFAULT_MESSAGES.productListText,
        productDetailText: setting.productDetailText || DEFAULT_MESSAGES.productDetailText,
        qrisInvoiceText: setting.qrisInvoiceText || DEFAULT_MESSAGES.qrisInvoiceText,
        forceJoin,
        fx: {
          welcomeSticker: DEFAULT_FX.welcomeSticker,
          purchaseSticker: DEFAULT_FX.purchaseSticker,
          welcomeEffect: DEFAULT_FX.welcomeEffect,
          purchaseEffect: DEFAULT_FX.purchaseEffect,
          flashMs: DEFAULT_FX.flashMs,
        },
      },
      async (user) => {
        await prisma.telegramMember.upsert({
          where: { telegramId: String(user.id) },
          update: {
            name: [user.first_name, user.last_name].filter(Boolean).join(" "),
            username: user.username ?? null,
          },
          create: {
            telegramId: String(user.id),
            name: [user.first_name, user.last_name].filter(Boolean).join(" "),
            username: user.username ?? null,
          },
        });
      },
      {
        async onProductAccess(user, meta) {
          const admin = (process.env.ADMIN_TELEGRAM_ID || "").trim();
          if (!admin) return;
          const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "-";
          const uname = user.username ? `@${user.username}` : "—";
          const badge = meta.registered ? "🔁 RETURNING" : "🆕 USER BARU";
          const text = [
            `🛍  USER BUKA PRODUK`,
            `━━━━━━━━━━━━━━━━`,
            `${badge}`,
            ``,
            `👤 Nama     : ${name}`,
            `🆔 Telegram : ${user.id}`,
            `🔗 Username : ${uname}`,
            `⏰ Waktu    : ${jakartaNow()} WIB`,
          ].join("\n");
          await safeSend(bot, admin, text);
        },
        async isRegisteredUser(telegramUserId) {
          const m = await prisma.telegramMember.findUnique({
            where: { telegramId: telegramUserId },
            select: { id: true },
          });
          return Boolean(m);
        },
        async getCategories(page) {
          const pageSize = 5;
          const [items, total] = await prisma.$transaction([
            prisma.category.findMany({
              where: { active: true },
              orderBy: { name: "asc" },
              skip: (page - 1) * pageSize,
              take: pageSize,
              select: { id: true, name: true },
            }),
            prisma.category.count({ where: { active: true } }),
          ]);
          return { items, total };
        },
        async getProducts(categoryId, page) {
          const pageSize = 5;
          const category = await prisma.category.findFirst({
            where: { id: categoryId, active: true },
            select: { id: true, name: true },
          });
          if (!category) return { items: [], total: 0, categoryName: "-" };
          const [products, total] = await prisma.$transaction([
            prisma.token.findMany({
              where: { categoryId, active: true },
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              skip: (page - 1) * pageSize,
              take: pageSize,
              select: {
                id: true,
                sku: true,
                model: true,
                name: true,
                price: true,
                description: true,
                categoryId: true,
                stockMode: true,
                stock: true,
              },
            }),
            prisma.token.count({ where: { categoryId, active: true } }),
          ]);
          const secretKey = (await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true } }))?.secretKey ?? null;
          const items = [];
          for (const p of products) {
            const st = await resolveProductStock(p, { secretKey });
            items.push({
              id: p.id,
              code: p.sku || p.model,
              name: p.name,
              price: Number(p.price),
              detail: p.description || "",
              stock: st.stock,
              stockMode: st.stockMode,
              stockLabel: st.stockLabel,
              categoryId: p.categoryId ?? 0,
              categoryName: category.name,
            });
          }
          return { items, total, categoryName: category.name };
        },
        async getProduct(productId) {
          const product = await prisma.token.findUnique({
            where: { id: productId },
            include: { category: { select: { name: true } } },
          });
          if (!product) return null;
          const secretKey = (await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true } }))?.secretKey ?? null;
          const st = await resolveProductStock(product, { secretKey });
          return {
            id: product.id,
            code: product.sku || product.model,
            name: product.name,
            price: Number(product.price),
            detail: product.description || "",
            stock: st.stock,
            stockMode: st.stockMode,
            stockLabel: st.stockLabel,
            categoryId: product.categoryId ?? 0,
            categoryName: product.category?.name ?? "-",
          };
        },
        async createOrder({ productId, qty, telegramUserId, chatId, detailMessageId }) {
          return createBotOrder({ tokenId: productId, qty, telegramUserId, chatId, detailMessageId });
        },
        async saveQrisMessage(invoice, messageId) {
          await prisma.paymentOrder.updateMany({
            where: { invoice },
            data: { qrisMessageId: messageId },
          });
        },
        async cancelOrder(invoice, telegramUserId) {
          const order = await prisma.paymentOrder.findFirst({
            where: { invoice, telegramUserId, status: "pending" },
          });
          if (!order) return { ok: false, error: "Transaksi tidak ditemukan" };
          await prisma.paymentOrder.update({
            where: { id: order.id },
            data: { status: "expired" },
          });
          return { ok: true };
        },
      }
    );

    running = { signature, bot };
    // Jangan drop pending updates: restart (ganti setting/crash) tidak boleh buang pesan user
    await bot.telegram.deleteWebhook({});
    void bot.launch().catch((error) => {
      if (running?.signature === signature) running = null;
      console.error(error);
    });
    console.log("Polling bot aktif");
  } catch (error) {
    running = null;
    console.error(error);
  } finally {
    syncing = false;
  }
}

async function main() {
  await syncBot();
  const timer = setInterval(() => {
    syncBot().catch(console.error);
  }, 2_000);

  const stop = (signal: string) => {
    clearInterval(timer);
    console.log("Stop", signal);
    if (running) running.bot.stop(signal);
    prisma.$disconnect().finally(() => process.exit(0));
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
