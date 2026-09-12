import { prisma } from "@/lib/prisma";
import { ContactClient } from "@/components/contact/contact-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kontak",
};

export default async function ContactPage() {
  const setting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { csTelegram: true, csWhatsapp: true, siteName: true },
  });

  return (
    <ContactClient
      cs={setting ? { telegram: setting.csTelegram, whatsapp: setting.csWhatsapp } : { telegram: null, whatsapp: null }}
      siteName={setting?.siteName ?? null}
    />
  );
}
