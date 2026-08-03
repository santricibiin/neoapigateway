import { prisma } from "@/lib/prisma";
import { qrisStaticToDynamic } from "@/lib/qris";
import { addCustomerQuota, provisionCustomerKey } from "@/lib/bandelbanget";
import { BANDEL_DEFAULT_MEMBER_PIN, fetchQuotaMeta, fetchResellerKeys, QUOTA_PACKAGES } from "@/lib/bandelbanget";

function invoiceCode() {
  return `RW${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Cek sisa kuota reseller admin (dari bandel upstream). */
export async function getResellerAdminQuota(): Promise<number | null> {
  const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true } });
  if (!setting?.secretKey) return null;
  try {
    const data = await fetchResellerKeys(setting.secretKey);
    return data.resellerQuota ?? null;
  } catch {
    return null;
  }
}

export type ReswebTopupResult =
  | { ok: true; invoice: string; amount: number; qrisPayload: string; expiresAt: Date; ttlMinutes: number }
  | { ok: false; error: string };

export async function createReswebTopup(resellerId: number, tierId: number): Promise<ReswebTopupResult> {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!setting || setting.qrisProvider === "none" || !setting.qrisStatic) {
    return { ok: false, error: "Pembayaran QRIS belum aktif. Hubungi admin." };
  }

  const tier = await prisma.resellerWebTier.findFirst({
    where: { id: tierId, active: true },
  });
  if (!tier) return { ok: false, error: "Paket tidak tersedia" };

  const reseller = await prisma.resellerWeb.findUnique({ where: { id: resellerId } });
  if (!reseller || !reseller.active) return { ok: false, error: "Akun reseller tidak aktif" };

  // Cek pending order existing
  const pending = await prisma.resellerWebOrder.findFirst({
    where: { resellerId, status: "pending", expiresAt: { gt: new Date() } },
  });
  if (pending) {
    return { ok: false, error: "Masih ada topup pending. Selesaikan atau tunggu kedaluwarsa." };
  }

  let amount = tier.price;
  let uniqueCode = 0;
  if (setting.uniqueCodeEnabled) {
    for (let i = 0; i < 80; i++) {
      const unik = Math.floor(Math.random() * 999) + 1;
      const candidate = tier.price + unik;
      const clash = await prisma.resellerWebOrder.findFirst({
        where: { status: "pending", amount: candidate, expiresAt: { gt: new Date() } },
        select: { id: true },
      });
      if (!clash) {
        amount = candidate;
        uniqueCode = unik;
        break;
      }
    }
    if (uniqueCode === 0) return { ok: false, error: "Nominal sedang penuh. Coba lagi." };
  }

  let qrisPayload: string;
  try {
    qrisPayload = qrisStaticToDynamic(setting.qrisStatic, { amount });
  } catch {
    return { ok: false, error: "QRIS statis tidak valid. Hubungi admin." };
  }

  const invoice = invoiceCode();
  const ttlMinutes = Math.max(1, Math.min(120, setting.qrisTtlMinutes ?? 5));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.resellerWebOrder.create({
    data: {
      invoice,
      resellerId,
      tierId: tier.id,
      status: "pending",
      amount,
      tokens: tier.tokens,
      unitPrice: tier.price,
      unitCost: tier.costPrice,
      qrisProvider: setting.qrisProvider,
      qrisPayload,
      expiresAt,
    },
  });

  return { ok: true, invoice, amount, qrisPayload, expiresAt, ttlMinutes };
}

/** Expire semua order resweb pending yang lewat expiry. */
export async function expireOverdueReswebOrders(): Promise<number> {
  const result = await prisma.resellerWebOrder.updateMany({
    where: { status: "pending", expiresAt: { lte: new Date() } },
    data: { status: "expired" },
  });
  return result.count;
}

/** Claim event dengan order resweb pending yang cocok. */
export async function claimReswebOrder(eventId: string) {
  await expireOverdueReswebOrders();
  return prisma.$transaction(async (tx) => {
    const event = await tx.paymentEvent.findUnique({ where: { id: eventId } });
    if (!event || event.matched || event.amount == null) return null;

    const order = await tx.resellerWebOrder.findFirst({
      where: {
        status: "pending",
        amount: event.amount,
        expiresAt: { gt: new Date() },
        createdAt: { lte: event.createdAt },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!order) return null;

    const claimed = await tx.resellerWebOrder.updateMany({
      where: { id: order.id, status: "pending" },
      data: { status: "paid", paidAt: event.createdAt },
    });
    if (claimed.count !== 1) return null;

    await tx.paymentEvent.update({ where: { id: event.id }, data: { matched: true } });

    // Tambah saldo reseller
    await tx.resellerWeb.update({
      where: { id: order.resellerId },
      data: { balance: { increment: order.tokens } },
    });

    return order;
  });
}

export type AddMemberResult =
  | { ok: true; member: { id: number; secretToken: string; apiKey: string | null; name: string | null; keyMasked: string | null; dashboardUrl: string; pin: string } }
  | { ok: false; error: string };

export type AddMemberQuotaResult =
  | { ok: true; tokens: number; validDays: number; balance: number }
  | { ok: false; error: string };

export async function addMemberQuota(resellerId: number, memberId: number, packageCode: string): Promise<AddMemberQuotaResult> {
  const pack = QUOTA_PACKAGES[packageCode as keyof typeof QUOTA_PACKAGES];
  if (!pack) return { ok: false, error: "Paket token tidak valid" };
  const member = await prisma.member.findFirst({ where: { id: memberId, resellerId } });
  if (!member) return { ok: false, error: "Member tidak ditemukan" };
  const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true } });
  if (!setting?.secretKey) return { ok: false, error: "Secret Key admin belum diatur" };

  let targetKeyId: number | null = null;
  try {
    const target = await fetchQuotaMeta(member.secretToken);
    const parsedId = Number(target.id);
    if (!Number.isInteger(parsedId) || parsedId < 1) return { ok: false, error: "Member tidak ditemukan di upstream" };
    targetKeyId = parsedId;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gagal memeriksa member" };
  }

  const reserved = await prisma.resellerWeb.updateMany({
    where: { id: resellerId, active: true, balance: { gte: BigInt(pack.tokens) } },
    data: { balance: { decrement: BigInt(pack.tokens) } },
  });
  if (!reserved.count) return { ok: false, error: "Saldo token tidak cukup" };

  let upstream;
  try {
    upstream = await addCustomerQuota(setting.secretKey, targetKeyId, pack.tokens, pack.validDays);
  } catch (error) {
    await prisma.resellerWeb.update({ where: { id: resellerId }, data: { balance: { increment: BigInt(pack.tokens) } } });
    return { ok: false, error: error instanceof Error ? error.message : "Tambah kuota gagal" };
  }

  try {
    await prisma.member.update({
      where: { id: member.id },
      data: {
        tokens: upstream.key?.maxTokens == null ? { increment: BigInt(pack.tokens) } : BigInt(upstream.key.maxTokens),
        validDays: upstream.key?.validDays ?? { increment: pack.validDays },
      },
    });
  } catch (error) {
    console.error("[resweb] kuota upstream berhasil, metadata member gagal diperbarui:", error);
  }
  const updated = await prisma.resellerWeb.findUniqueOrThrow({ where: { id: resellerId }, select: { balance: true } });
  return { ok: true, tokens: pack.tokens, validDays: pack.validDays, balance: Number(updated.balance) };
}

/** Buat token member baru via bandel provision, kurangi saldo reseller. */
export async function addMember(resellerId: number, packageCode: string): Promise<AddMemberResult> {
  const pack = QUOTA_PACKAGES[packageCode as keyof typeof QUOTA_PACKAGES];
  if (!pack) return { ok: false, error: "Paket token tidak valid" };
  const { tokens, validDays } = pack;

  const reseller = await prisma.resellerWeb.findUnique({ where: { id: resellerId } });
  if (!reseller || !reseller.active) return { ok: false, error: "Akun tidak aktif" };
  if (reseller.balance < BigInt(tokens)) return { ok: false, error: "Saldo token tidak cukup" };

  // Cek stok reseller admin
  const adminQuota = await getResellerAdminQuota();
  if (adminQuota !== null && adminQuota < tokens) {
    return { ok: false, error: "Stok kuota admin habis. Hubungi admin." };
  }

  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { secretKey: true, pin: true },
  });
  if (!setting?.secretKey) return { ok: false, error: "Secret Key admin belum diatur" };

  let created;
  try {
    created = await provisionCustomerKey(setting.secretKey, tokens, validDays, setting.pin || undefined);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal provision member" };
  }

  const secretToken = created.secretToken;
  if (!secretToken) return { ok: false, error: "Provision gagal: secretToken kosong" };

  // Simpan member & kurangi saldo dalam transaksi
  const member = await prisma.$transaction(async (tx) => {
    const updated = await tx.resellerWeb.update({
      where: { id: resellerId },
      data: { balance: { decrement: BigInt(tokens) } },
    });
    if (updated.balance < BigInt(0)) throw new Error("Saldo tidak cukup");

    return tx.member.create({
      data: {
        resellerId,
        secretToken,
        apiKey: created.apiKey || null,
        name: created.name || null,
        keyMasked: created.keyMasked || null,
        tokens: BigInt(tokens),
        validDays,
      },
    });
  });

  const pub = process.env.NEXT_PUBLIC_PUBLIC_API_BASE || process.env.PUBLIC_API_BASE;
  const dashboardUrl = `${pub || ""}/quota/member/${secretToken}`;

  return {
    ok: true,
    member: {
      id: member.id,
      secretToken,
      apiKey: member.apiKey,
      name: member.name,
      keyMasked: member.keyMasked,
      dashboardUrl,
      pin: created.pin || BANDEL_DEFAULT_MEMBER_PIN,
    },
  };
}
