import type { Viewport } from "next";
import "./globals.css";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { siteName } = await getBranding();
  return {
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    description: `${siteName} — Token API AI Multi Model`,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { siteName, logoUrl } = await getBranding();
  return (
    <html lang="id">
      <body className="min-h-screen bg-base-bg text-base-ink antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BRAND__=${JSON.stringify({ siteName, logoUrl })};`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
