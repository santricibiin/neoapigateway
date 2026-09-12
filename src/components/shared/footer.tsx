"use client";

import Link from "next/link";
import { useBrand } from "@/lib/use-brand";
import { useT } from "@/lib/lang";

const footerLinks = [
  { href: "/", labelId: "Beranda" },
  { href: "/kontak", labelId: "Kontak" },
  { href: "/login/admin", labelId: "Admin" },
];

export function Footer() {
  const brand = useBrand();
  const t = useT();
  const siteName = brand?.siteName ?? "Neo API Gateway";

  return (
    <footer className="border-t border-base-line bg-base-bg px-4 py-4 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-xs font-semibold text-base-ink/50">
          &copy; {new Date().getFullYear()} {siteName}
        </p>
        <ul className="flex items-center gap-4">
          {footerLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-xs font-semibold text-base-ink/50 transition-colors hover:text-base-ink"
              >
                {t(link.labelId)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
