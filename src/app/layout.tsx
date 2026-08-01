import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neo — Soft Neobrutalism",
  description:
    "Next.js boilerplate with Soft Neobrutalism design, Prisma, and MySQL.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
