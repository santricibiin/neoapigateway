"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Produk" },
  { href: "/cek-kuota", label: "Cek Kuota" },
];

export function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-40 border-b-2 border-base-ink bg-base-bg/90 backdrop-blur"
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded-neo border-2 border-base-ink bg-accent-sun px-2 py-1 text-lg font-extrabold shadow-neo-sm">
            NEO
          </span>
        </Link>
        <ul className="hidden items-center gap-6 sm:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="font-semibold text-base-ink transition-colors hover:text-accent-sky"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/cek-kuota">
          <Button variant="sky" size="sm">Cek Kuota</Button>
        </Link>
      </nav>
    </motion.header>
  );
}
