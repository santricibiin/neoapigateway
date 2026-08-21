import { Context, Markup, Telegraf } from "telegraf";

function escapeMarkdownV2(value: string) {
  return value.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

function applyTemplate(template: string, vars: Record<string, string>, rawKeys: string[] = []) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    const v = rawKeys.includes(key) ? value : escapeMarkdownV2(value);
    out = out.replaceAll(`{${key}}`, v);
  }
  return out;
}

function stripMarkdownV2(value: string) {
  return value.replace(/\\([_*\[\]()~`>#+\-=|{}.!\\])/g, "$1");
}

type EditTarget = { chatId: number; messageId: number };

function isPhotoMessage(msg: unknown): boolean {
  return Boolean(
    msg &&
      typeof msg === "object" &&
      "photo" in msg &&
      Array.isArray((msg as { photo?: unknown }).photo) &&
      ((msg as { photo: unknown[] }).photo?.length ?? 0) > 0
  );
}

function msgChatId(msg: unknown): number | undefined {
  if (msg && typeof msg === "object" && "chat" in msg) {
    const chat = (msg as { chat?: { id?: number } }).chat;
    return chat?.id;
  }
  return undefined;
}

function msgId(msg: unknown): number | undefined {
  if (msg && typeof msg === "object" && "message_id" in msg) {
    return (msg as { message_id?: number }).message_id;
  }
  return undefined;
}

async function replyPhoto(ctx: Context, photoFileId: string, text: string, extra?: object) {
  const caption = text.length > 1024 ? `${text.slice(0, 1000)}…` : text;
  try {
    await ctx.replyWithPhoto(photoFileId, {
      caption,
      parse_mode: "MarkdownV2",
      ...extra,
    } as never);
  } catch {
    await ctx.replyWithPhoto(photoFileId, {
      caption: stripMarkdownV2(caption),
      ...extra,
    } as never);
  }
}

function stripEffect(extra?: object) {
  if (!extra) return {};
  const { message_effect_id: _e, ...rest } = extra as Record<string, unknown>;
  return rest;
}

async function replyText(ctx: Context, text: string, extra?: object) {
  const chatId = ctx.chat?.id;
  const effectId = (extra as { message_effect_id?: string } | undefined)?.message_effect_id;
  const base = stripEffect(extra);

  if (chatId != null && effectId) {
    try {
      await ctx.telegram.callApi("sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
        message_effect_id: effectId,
        ...base,
      } as never);
      return;
    } catch (e) {
      console.warn("[fx] message effect invalid/fail:", e instanceof Error ? e.message : e);
    }
  }

  try {
    await ctx.reply(text, { ...base, parse_mode: "MarkdownV2" } as never);
  } catch {
    await ctx.reply(stripMarkdownV2(text), base as never).catch(() => null);
  }
}

function withEffect(extra: object | undefined, effectId?: string | null) {
  if (!effectId) return extra ?? {};
  return { ...extra, message_effect_id: effectId };
}

async function sendMarkdown(
  ctx: Context,
  text: string,
  extra?: object,
  edit = false,
  target?: EditTarget,
  photoFileId?: string | null
) {
  const withMd = { ...extra, parse_mode: "MarkdownV2" as const };
  const caption = text.length > 1024 ? `${text.slice(0, 1000)}…` : text;
  const plain = stripMarkdownV2(text);
  const plainCaption = stripMarkdownV2(caption);

  const cbMsg =
    edit && !target && "callbackQuery" in ctx
      ? (ctx as Context & { callbackQuery?: { message?: unknown } }).callbackQuery?.message
      : undefined;

  const chatId = target?.chatId ?? msgChatId(cbMsg) ?? ctx.chat?.id;
  const messageId = target?.messageId ?? msgId(cbMsg);
  const currentIsPhoto = isPhotoMessage(cbMsg);

  if (!edit && !target) {
    if (photoFileId) {
      try {
        await replyPhoto(ctx, photoFileId, text, extra);
        return;
      } catch {
        /* fallthrough text */
      }
    }
    await replyText(ctx, text, extra);
    return;
  }

  if (chatId == null || messageId == null) {
    if (photoFileId) {
      try {
        await replyPhoto(ctx, photoFileId, text, extra);
        return;
      } catch {
        /* */
      }
    }
    await replyText(ctx, text, extra);
    return;
  }

  if (photoFileId && !currentIsPhoto) {
    await ctx.telegram.deleteMessage(chatId, messageId).catch(() => null);
    try {
      await replyPhoto(ctx, photoFileId, text, extra);
    } catch {
      await replyText(ctx, text, extra);
    }
    return;
  }

  if (!photoFileId && currentIsPhoto) {
    await ctx.telegram.deleteMessage(chatId, messageId).catch(() => null);
    await replyText(ctx, text, extra);
    return;
  }

  if (photoFileId && currentIsPhoto) {
    try {
      await ctx.telegram.editMessageMedia(
        chatId,
        messageId,
        undefined,
        {
          type: "photo",
          media: photoFileId,
          caption,
          parse_mode: "MarkdownV2",
        } as never,
        extra as never
      );
      return;
    } catch {
      try {
        await ctx.telegram.editMessageCaption(chatId, messageId, undefined, caption, withMd as never);
        return;
      } catch {
        try {
          await ctx.telegram.editMessageCaption(chatId, messageId, undefined, plainCaption, extra as never);
          return;
        } catch {
          await ctx.telegram.deleteMessage(chatId, messageId).catch(() => null);
          try {
            await replyPhoto(ctx, photoFileId, text, extra);
          } catch {
            await replyText(ctx, text, extra);
          }
          return;
        }
      }
    }
  }

  try {
    await ctx.telegram.editMessageText(chatId, messageId, undefined, text, withMd as never);
  } catch {
    try {
      await ctx.telegram.editMessageText(chatId, messageId, undefined, plain, extra as never);
    } catch {
      await ctx.telegram.deleteMessage(chatId, messageId).catch(() => null);
      await replyText(ctx, text, extra);
    }
  }
}

function chunkButtons<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

const LIST_PAGE_SIZE = 5;

const idr = new Intl.NumberFormat("id-ID");

export type BotCategory = { id: number; name: string };
export type BotProduct = {
  id: number;
  code: string;
  name: string;
  price: number;
  detail: string;
  stock: number;
  stockMode?: "counted" | "external";
  stockLabel?: string;
  categoryId: number;
  categoryName: string;
};

export type BuyResult =
  | {
      ok: true;
      invoice: string;
      amount: number;
      qty: number;
      productName: string;
      productCode: string;
      unitPrice: number;
      qrisPayload: string;
      provider: string;
      expiresAt: Date;
      ttlMinutes: number;
    }
  | { ok: false; error: string };

export type BotData = {
  getCategories: (page: number) => Promise<{ items: BotCategory[]; total: number }>;
  getProducts: (
    categoryId: number,
    page: number
  ) => Promise<{ items: BotProduct[]; total: number; categoryName: string }>;
  getProduct: (productId: number) => Promise<BotProduct | null>;
  createOrder?: (input: {
    productId: number;
    qty: number;
    telegramUserId: string;
    chatId: number;
    detailMessageId?: number;
  }) => Promise<BuyResult>;
  saveQrisMessage?: (invoice: string, messageId: number) => Promise<void>;
  cancelOrder?: (invoice: string, telegramUserId: string) => Promise<{ ok: boolean; error?: string }>;
  isRegisteredUser?: (telegramUserId: string) => Promise<boolean>;
  onProductAccess?: (
    user: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    },
    meta: { registered: boolean }
  ) => Promise<void>;
};

export type BotTexts = {
  welcomeText: string;
  categoryText: string;
  productListText: string;
  productDetailText: string;
  qrisInvoiceText: string;
  forceJoin?: {
    on: boolean;
    link: string;
    chatId: string;
  };
  fx?: {
    welcomeSticker?: string | null;
    purchaseSticker?: string | null;
    welcomeEffect?: string | null;
    purchaseEffect?: string | null;
    flashMs?: number;
  };
};

export function createBot(
  token: string,
  texts: BotTexts,
  onStart?: (user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  }) => Promise<void>,
  data?: BotData
) {
  const {
    welcomeText,
    categoryText,
    productListText,
    productDetailText,
    qrisInvoiceText,
    forceJoin,
    fx = {},
  } = texts;
  const bot = new Telegraf(token);
  const qtyByUser = new Map<number, number>();
  const qtyEditPending = new Map<number, { productId: number; chatId: number; messageId: number }>();

  async function flashSticker(chatId: number, stickerId: string | null | undefined, ms = 3000) {
    if (!stickerId) return;
    try {
      const sent = await bot.telegram.sendSticker(chatId, stickerId);
      await new Promise((r) => setTimeout(r, ms));
      await bot.telegram.deleteMessage(chatId, sent.message_id).catch(() => null);
    } catch (e) {
      console.error("[fx] sticker failed:", e instanceof Error ? e.message : e);
    }
  }

  async function isChannelMember(userId: number): Promise<boolean> {
    if (!forceJoin?.on || !forceJoin.chatId) return true;
    try {
      const m = await bot.telegram.getChatMember(forceJoin.chatId, userId);
      return ["creator", "administrator", "member", "restricted"].includes(m.status);
    } catch {
      return false;
    }
  }

  function joinGateText(name: string) {
    return applyTemplate(
      "🔐 *Akses terbatas*\n\n" +
        "Halo *{name}*\\!\n\n" +
        "Untuk membuka katalog dan bertransaksi di bot ini, silakan bergabung ke *channel resmi* kami terlebih dahulu\\.\n\n" +
        "✨ Manfaat join:\n" +
        "• Info produk \\& promo terbaru\n" +
        "• Notifikasi update stok\n" +
        "• Akses penuh ke bot\n\n" +
        "1️⃣ Tekan *Gabung channel*\n" +
        "2️⃣ Setelah join, tekan *Saya sudah join*\n\n" +
        "Kami cek keanggotaan secara otomatis\\.",
      { name }
    );
  }

  function joinGateKeyboard() {
    const link = forceJoin?.link || "https://t.me/";
    return Markup.inlineKeyboard([
      [Markup.button.url("📢 Gabung channel", link)],
      [Markup.button.callback("✅ Saya sudah join", "checkjoin")],
    ]);
  }

  async function sendWelcome(ctx: Context, user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  }) {
    const chatId = ctx.chat?.id;
    if (chatId != null) {
      await flashSticker(chatId, fx.welcomeSticker, fx.flashMs ?? 3000);
    }
    await onStart?.(user);
    const text = applyTemplate(welcomeText, {
      name: [user.first_name, user.last_name].filter(Boolean).join(" "),
      username: user.username ? `@${user.username}` : "-",
      tanggal: new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeZone: "Asia/Jakarta",
      }).format(new Date()),
    });
    await sendMarkdown(ctx, text, withEffect(undefined, fx.welcomeEffect || null));
  }

  bot.start(async (ctx) => {
    const user = ctx.from;
    qtyEditPending.delete(user.id);

    const registered = data?.isRegisteredUser ? await data.isRegisteredUser(String(user.id)) : false;

    if (forceJoin?.on && forceJoin.chatId && forceJoin.link && !registered) {
      const ok = await isChannelMember(user.id);
      if (!ok) {
        const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
        await sendMarkdown(ctx, joinGateText(name), joinGateKeyboard());
        return;
      }
    }

    await sendWelcome(ctx, user);
  });

  bot.action("checkjoin", async (ctx) => {
    const user = ctx.from;
    if (!forceJoin?.on || !forceJoin.chatId) {
      await ctx.answerCbQuery("Fitur join tidak aktif");
      await sendWelcome(ctx, user);
      return;
    }

    const ok = await isChannelMember(user.id);
    if (!ok) {
      await ctx.answerCbQuery("Belum terdeteksi join. Pastikan sudah join channel.", { show_alert: true });
      return;
    }

    await ctx.answerCbQuery("Berhasil! Selamat datang ✨");
    try {
      await ctx.deleteMessage();
    } catch {
      /* */
    }
    await sendWelcome(ctx, user);
  });

  async function showCategories(ctx: Context, page: number, edit = false) {
    const result = (await data?.getCategories(page)) ?? { items: [], total: 0 };
    if (!result.items.length) {
      await sendMarkdown(ctx, escapeMarkdownV2("📭 Katalog masih kosong. Coba lagi nanti."), undefined, edit);
      return;
    }
    const totalPages = Math.max(1, Math.ceil(result.total / LIST_PAGE_SIZE));
    const numberButtons = result.items.map((item, index) =>
      Markup.button.callback(String((page - 1) * LIST_PAGE_SIZE + index + 1), `cat:${item.id}:1`)
    );
    const numberRows = chunkButtons(numberButtons, 5);
    const navigation = [];
    if (page > 1) navigation.push(Markup.button.callback("‹", `cats:${page - 1}`));
    navigation.push(Markup.button.callback(`${page}/${totalPages}`, "noop"));
    if (page < totalPages) navigation.push(Markup.button.callback("›", `cats:${page + 1}`));
    const keyboard = Markup.inlineKeyboard([
      ...numberRows,
      navigation,
      [Markup.button.callback("Menu awal", "home")],
    ]);
    const list = result.items
      .map((item, index) => `${(page - 1) * LIST_PAGE_SIZE + index + 1}. ${item.name}`)
      .join("\n");
    const text = categoryText.includes("{kategori}")
      ? applyTemplate(categoryText, { kategori: list })
      : `${categoryText}\n\n${escapeMarkdownV2(list)}`;
    await sendMarkdown(ctx, text, keyboard, edit);
  }

  async function showProducts(ctx: Context, categoryId: number, page: number, edit = false) {
    const result = (await data?.getProducts(categoryId, page)) ?? {
      items: [],
      total: 0,
      categoryName: "-",
    };
    if (!result.items.length) {
      const msg = applyTemplate("Belum ada produk di kategori *{kategori}*\\.", {
        kategori: result.categoryName,
      });
      const kb = Markup.inlineKeyboard([[Markup.button.callback("‹ Kategori", "cats:1")]]);
      await sendMarkdown(ctx, msg, kb, edit);
      return;
    }
    const totalPages = Math.max(1, Math.ceil(result.total / LIST_PAGE_SIZE));
    const numberButtons = result.items.map((item, index) =>
      Markup.button.callback(String((page - 1) * LIST_PAGE_SIZE + index + 1), `prd:${item.id}`)
    );
    const numberRows = chunkButtons(numberButtons, 5);
    const navigation = [];
    if (page > 1) navigation.push(Markup.button.callback("‹", `pl:${categoryId}:${page - 1}`));
    navigation.push(Markup.button.callback(`${page}/${totalPages}`, "noop"));
    if (page < totalPages) navigation.push(Markup.button.callback("›", `pl:${categoryId}:${page + 1}`));
    const keyboard = Markup.inlineKeyboard([
      ...numberRows,
      navigation,
      [Markup.button.callback("Kembali ke kategori", "cats:1")],
    ]);
    const list = result.items
      .map((item, index) => {
        const n = (page - 1) * LIST_PAGE_SIZE + index + 1;
        const name = escapeMarkdownV2(item.name);
        const price = escapeMarkdownV2(`Rp ${idr.format(item.price)}`);
        return `\\[${n}\\] ${name} \\- *${price}*`;
      })
      .join("\n");
    const text = applyTemplate(productListText, { kategori: result.categoryName, produk: list }, ["produk"]);
    await sendMarkdown(ctx, text, keyboard, edit);
  }

  async function showProductDetail(ctx: Context, productId: number, qty: number, edit = false, target?: EditTarget) {
    const product = await data?.getProduct(productId);
    if (!product) {
      if (!target) {
        await sendMarkdown(ctx, escapeMarkdownV2("Produk tidak ditemukan."), undefined, edit);
      }
      return;
    }
    const isExternal = product.stockMode === "external";
    const maxQty = isExternal ? 1 : Math.max(product.stock, 1);
    const safeQty = isExternal ? 1 : Math.max(1, Math.min(qty, maxQty));
    if (ctx.from) qtyByUser.set(ctx.from.id, safeQty);

    const stockText =
      product.stockLabel ||
      (isExternal ? (product.stock > 0 ? "Tersedia" : "Habis") : String(product.stock));

    const detailTpl = productDetailText
      .replace(/\*\{harga\}\*/g, "{harga}")
      .replace(/\*\{total\}\*/g, "{total}");

    const text = applyTemplate(detailTpl, {
      nama: product.name,
      kode: product.code,
      harga: `Rp ${idr.format(product.price)}`,
      stok: stockText,
      detail: product.detail,
      jumlah: String(safeQty),
      total: `Rp ${idr.format(product.price * safeQty)}`,
      kategori: product.categoryName,
    });

    const buyDisabled = product.stock < 1;
    const qtyRow = isExternal
      ? []
      : [
          [
            Markup.button.callback("−", `qty:${product.id}:-`),
            Markup.button.callback("✎", `qtyedit:${product.id}`),
            Markup.button.callback("+", `qty:${product.id}:+`),
          ],
        ];

    const keyboard = Markup.inlineKeyboard([
      ...qtyRow,
      [
        buyDisabled
          ? Markup.button.callback("⛔ Stok habis", "noop")
          : Markup.button.callback("Beli sekarang", `buy:${product.id}`),
      ],
      [Markup.button.callback("Kembali ke kategori", "cats:1")],
      [Markup.button.callback("Daftar produk", `pl:${product.categoryId}:1`)],
    ]);

    await sendMarkdown(ctx, text, keyboard, edit, target);
  }

  bot.command("produk", async (ctx) => {
    if (ctx.from) qtyEditPending.delete(ctx.from.id);
    const user = ctx.from;
    const registered = data?.isRegisteredUser ? await data.isRegisteredUser(String(user.id)) : false;
    void data?.onProductAccess?.(user, { registered }).catch((e) => {
      console.error("[onProductAccess]", e instanceof Error ? e.message : e);
    });
    return showCategories(ctx, 1);
  });

  bot.command("getid", async (ctx) => {
    const chat = ctx.chat;
    if (!chat) return;
    const adminId = (process.env.ADMIN_TELEGRAM_ID || "").trim();
    const fromId = ctx.from?.id != null ? String(ctx.from.id) : "";
    if (ctx.from && adminId && fromId !== adminId) return;
    const lines = [`chat_id: ${chat.id}`, `type: ${chat.type}`];
    if ("title" in chat && chat.title) lines.push(`title: ${chat.title}`);
    if ("username" in chat && chat.username) lines.push(`username: @${chat.username}`);
    if (ctx.from) {
      lines.push(`from_id: ${ctx.from.id}`);
      if (ctx.from.username) lines.push(`from: @${ctx.from.username}`);
    }
    await ctx.reply(lines.join("\n")).catch(() => null);
  });

  bot.action(/^cats:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showCategories(ctx, Number(ctx.match[1]), true);
  });

  bot.action(/^cat:([^:]+):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showProducts(ctx, Number(ctx.match[1]), Number(ctx.match[2]), true);
  });

  bot.action(/^pl:([^:]+):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showProducts(ctx, Number(ctx.match[1]), Number(ctx.match[2]), true);
  });

  bot.action(/^prd:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const uid = ctx.from?.id;
    if (uid) qtyByUser.set(uid, 1);
    await showProductDetail(ctx, Number(ctx.match[1]), 1, true);
  });

  bot.action(/^qty:([^:]+):([+-])$/, async (ctx) => {
    const productId = Number(ctx.match[1]);
    const dir = ctx.match[2];
    const product = await data?.getProduct(productId);
    if (!product) {
      await ctx.answerCbQuery("Produk tidak ditemukan");
      return;
    }
    const uid = ctx.from?.id;
    if (uid) qtyEditPending.delete(uid);
    const current = (uid && qtyByUser.get(uid)) || 1;
    const max = Math.max(product.stock, 1);
    const next = dir === "+" ? Math.min(current + 1, max) : Math.max(current - 1, 1);
    if (uid) qtyByUser.set(uid, next);
    await ctx.answerCbQuery(`Jumlah: ${next}`);
    await showProductDetail(ctx, productId, next, true);
  });

  bot.action(/^qtyedit:(.+)$/, async (ctx) => {
    const productId = Number(ctx.match[1]);
    const product = await data?.getProduct(productId);
    if (!product) {
      await ctx.answerCbQuery("Produk tidak ditemukan");
      return;
    }
    const msg = ctx.callbackQuery.message;
    if (!msg || !("message_id" in msg)) {
      await ctx.answerCbQuery("Pesan tidak valid");
      return;
    }
    qtyEditPending.set(ctx.from.id, {
      productId,
      chatId: msg.chat.id,
      messageId: msg.message_id,
    });
    await ctx.answerCbQuery("Silahkan ketik jumlah", { show_alert: false });
  });

  bot.on("text", async (ctx, next) => {
    const uid = ctx.from?.id;
    if (!uid) return next();
    const pending = qtyEditPending.get(uid);
    if (!pending) return next();

    const raw = ctx.message.text.trim();
    if (raw.startsWith("/")) {
      qtyEditPending.delete(uid);
      return next();
    }

    await ctx.deleteMessage().catch(() => null);

    const product = await data?.getProduct(pending.productId);
    if (!product) {
      qtyEditPending.delete(uid);
      return;
    }

    const max = Math.max(product.stock, 1);
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1 || n > max) {
      const warn = await ctx.reply(`Jumlah 1-${max}`).catch(() => null);
      if (warn) {
        setTimeout(() => {
          ctx.telegram.deleteMessage(warn.chat.id, warn.message_id).catch(() => null);
        }, 2000);
      }
      return;
    }

    qtyEditPending.delete(uid);
    qtyByUser.set(uid, n);
    await showProductDetail(ctx, pending.productId, n, true, {
      chatId: pending.chatId,
      messageId: pending.messageId,
    });
  });

  bot.action(/^buy:(.+)$/, async (ctx) => {
    const productId = Number(ctx.match[1]);
    const uid = ctx.from?.id;
    if (uid) qtyEditPending.delete(uid);

    if (!data?.createOrder) {
      await ctx.answerCbQuery("Pembayaran belum dikonfigurasi");
      return;
    }

    const qty = (uid && qtyByUser.get(uid)) || 1;
    const msg = ctx.callbackQuery.message;
    const detailMessageId = msg && "message_id" in msg ? msg.message_id : undefined;
    const chatId = msg && "chat" in msg ? msg.chat.id : ctx.chat?.id;
    if (!uid || !chatId) {
      await ctx.answerCbQuery("Gagal");
      return;
    }

    await ctx.answerCbQuery("Membuat invoice...");

    const order = await data.createOrder({
      productId,
      qty,
      telegramUserId: String(uid),
      chatId,
      detailMessageId,
    });

    if (!order.ok) {
      await sendMarkdown(ctx, escapeMarkdownV2(order.error));
      return;
    }

    if (detailMessageId) {
      await ctx.telegram.deleteMessage(chatId, detailMessageId).catch(() => null);
    }

    const base = order.unitPrice * order.qty;
    const unique = order.amount - base;
    const caption = applyTemplate(qrisInvoiceText, {
      invoice: order.invoice,
      nama: order.productName,
      kode: order.productCode,
      harga: `Rp ${idr.format(order.unitPrice)}`,
      jumlah: String(order.qty),
      total_dasar: `Rp ${idr.format(base)}`,
      kode_unik: String(unique).padStart(3, "0"),
      total: `Rp ${idr.format(order.amount)}`,
      provider: order.provider,
      ttl_menit: String(order.ttlMinutes),
    });

    const qrisKeyboard = Markup.inlineKeyboard([
      [Markup.button.callback("❌ Batalkan transaksi", `cancel:${order.invoice}`)],
      [Markup.button.callback("🏷 Kembali ke kategori", "cats:1")],
    ]);

    try {
      const QRCode = (await import("qrcode")).default;
      const png = await QRCode.toBuffer(order.qrisPayload, { width: 400, margin: 2 });
      const sent = await ctx.replyWithPhoto(
        { source: png },
        { caption, parse_mode: "MarkdownV2", ...qrisKeyboard } as never
      );
      await data.saveQrisMessage?.(order.invoice, sent.message_id);
    } catch {
      const plain = stripMarkdownV2(caption) + "\n\n" + order.qrisPayload;
      const sent = await ctx.reply(plain, qrisKeyboard);
      await data.saveQrisMessage?.(order.invoice, sent.message_id);
    }
  });

  bot.action(/^cancel:(.+)$/, async (ctx) => {
    const invoice = ctx.match[1];
    const uid = ctx.from?.id;
    if (!uid || !data?.cancelOrder) {
      await ctx.answerCbQuery("Gagal");
      return;
    }
    const result = await data.cancelOrder(invoice, String(uid));
    if (!result.ok) {
      await ctx.answerCbQuery(result.error || "Tidak dapat dibatalkan");
      return;
    }
    await ctx.answerCbQuery("Transaksi dibatalkan");
    const msg = ctx.callbackQuery.message;
    if (msg && "message_id" in msg) {
      await ctx.telegram.deleteMessage(msg.chat.id, msg.message_id).catch(() => null);
    }
    await sendMarkdown(
      ctx,
      applyTemplate("Transaksi *{invoice}* dibatalkan\\.\n\nAnda dapat memesan ulang kapan saja\\.", {
        invoice,
      }),
      Markup.inlineKeyboard([[Markup.button.callback("Kembali ke kategori", "cats:1")]])
    );
  });

  bot.action("noop", (ctx) => ctx.answerCbQuery());

  bot.action("home", async (ctx) => {
    await ctx.answerCbQuery();
    await sendMarkdown(ctx, escapeMarkdownV2("Menu awal. Ketik /start atau /produk"), undefined, true);
  });

  return bot;
}
