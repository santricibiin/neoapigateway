"use client";

import Link from "next/link";
import { useBrand } from "@/lib/use-brand";

const footerLinks = [
  { href: "/", label: "Beranda" },
  { href: "/cek-kuota", label: "Cek Kuota" },
  { href: "/login/admin", label: "Admin" },
];

export function Footer() {
  const brand = useBrand();
  const siteName = brand?.siteName ?? "Neo API Gateway";

  return (
    <footer className="bg-base-bg px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm font-semibold text-base-ink/60">
          &copy; {new Date().getFullYear()} {siteName} · Token API AI
        </p>
        <ul className="flex items-center gap-5">
          {footerLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-semibold text-base-ink/60 transition-colors hover:text-accent-sky"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
