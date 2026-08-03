import { redirect } from "next/navigation";
import { getResWebSession } from "@/lib/resweb-auth";
import { prisma } from "@/lib/prisma";
import { ReswebShell } from "@/components/resweb/resweb-shell";

export const dynamic = "force-dynamic";

export default async function ResLayout({ children }: { children: React.ReactNode }) {
  const session = getResWebSession();
  if (!session) {
    redirect("/login/res");
  }
  const reseller = await prisma.resellerWeb.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, balance: true, active: true },
  });

  return <ReswebShell reseller={reseller ? { ...reseller, balance: Number(reseller.balance) } : null}>{children}</ReswebShell>;
}
