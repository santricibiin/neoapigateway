import { getResWebSession } from "@/lib/resweb-auth";
import { prisma } from "@/lib/prisma";
import { ReswebDashboardClient } from "@/components/resweb/resweb-dashboard-client";
import { fetchResellerKeys } from "@/lib/bandelbanget";

export const dynamic = "force-dynamic";

const MEMBERS_PER_PAGE = 10;

type StatusFilter = "all" | "active" | "exceeded";

function tokenFromDashboardUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const token = new URL(url).pathname.split("/").filter(Boolean).pop();
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Status live member ada di upstream (bukan kolom lokal). Ambil semua key
 * reseller (loop halaman, sudah dibundel fetchResellerKeys), cocokkan
 * dengan member lokal lewat secretToken/keyMasked/apiKey, lalu kembalikan
 * daftar secretToken per status.
 */
async function memberStatusMap(resellerId: number): Promise<Map<string, string>> {
  const setting = await prisma.setting.findUnique({ where: { id: 1 }, select: { secretKey: true } });
  if (!setting?.secretKey) return new Map();
  try {
    const { keys } = await fetchResellerKeys(setting.secretKey);
    const statusByKeyMasked = new Map<string, string>();
    const statusByToken = new Map<string, string>();
    for (const k of keys) {
      const status = String(k.status ?? "");
      if (k.keyMasked) statusByKeyMasked.set(k.keyMasked, status);
      const token = tokenFromDashboardUrl(k.dashboardUrl) || (typeof k.secretToken === "string" ? k.secretToken : null);
      if (token) statusByToken.set(token, status);
    }
    const members = await prisma.member.findMany({
      where: { resellerId },
      select: { secretToken: true, keyMasked: true, apiKey: true },
    });
    const map = new Map<string, string>();
    for (const m of members) {
      const status =
        statusByToken.get(m.secretToken) ??
        (m.keyMasked ? statusByKeyMasked.get(m.keyMasked) : undefined) ??
        (m.apiKey ? statusByKeyMasked.get(m.apiKey) : undefined) ??
        "";
      map.set(m.secretToken, status);
    }
    return map;
  } catch {
    return new Map();
  }
}

export default async function ResDashboardPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; status?: string };
}) {
  const session = getResWebSession();
  if (!session) return null;

  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const status: StatusFilter =
    searchParams?.status === "active" || searchParams?.status === "exceeded" ? (searchParams.status as StatusFilter) : "all";

  // Filter status butuh data live dari upstream — hanya ambil kalau diminta.
  let statusTokens: Set<string> | null = null;
  let statusMap: Map<string, string> | null = null;
  if (status !== "all") {
    const map = await memberStatusMap(session.id);
    statusMap = map;
    statusTokens = new Set(
      [...map.entries()].filter(([, s]) => (status === "active" ? s === "active" : s === "exceeded")).map(([t]) => t)
    );
  }

  // Kondisi where: nama LIKE + status (via secretToken IN).
  const where: { resellerId: number; name?: { contains: string }; secretToken?: { in: string[] } } = {
    resellerId: session.id,
  };
  if (q) where.name = { contains: q };
  if (statusTokens) where.secretToken = { in: [...statusTokens] };

  const [reseller, totalMembers, members, paidTopups] = await Promise.all([
    prisma.resellerWeb.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, balance: true, active: true, createdAt: true },
    }),
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MEMBERS_PER_PAGE,
      skip: (page - 1) * MEMBERS_PER_PAGE,
    }),
    prisma.resellerWebOrder.count({ where: { resellerId: session.id, status: "paid" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMembers / MEMBERS_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  // Ambil status live untuk member di halaman ini (badge per baris) —
  // hanya kalau map sudah ada (filter aktif) supaya hemat request.
  const pageStatus = statusMap
    ? Object.fromEntries(members.map((m) => [m.id, statusMap.get(m.secretToken) ?? ""]))
    : null;

  return (
    <ReswebDashboardClient
      reseller={reseller ? { ...reseller, balance: Number(reseller.balance), createdAt: reseller.createdAt.toISOString() } : null}
      members={members.map((m) => ({
        id: m.id,
        secretToken: m.secretToken,
        apiKey: m.apiKey,
        name: m.name,
        keyMasked: m.keyMasked,
        tokens: Number(m.tokens),
        validDays: m.validDays,
        createdAt: m.createdAt.toISOString(),
        status: pageStatus ? pageStatus[m.id] : null,
      }))}
      paidTopups={paidTopups}
      totalMembers={totalMembers}
      page={safePage}
      totalPages={totalPages}
      query={searchParams?.q ?? ""}
      statusFilter={status}
    />
  );
}
