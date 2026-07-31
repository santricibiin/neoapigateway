import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neo — Soft Neobrutalism",
  description:
    "Next.js boilerplate with Soft Neobrutalism design, Prisma, and MySQL.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-base-bg text-base-ink antialiased">
        {children}
      </body>
    </html>
  );
}
