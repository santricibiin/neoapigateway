import type { Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export async function generateMetadata() {
  const { siteName, logoUrl } = await getBranding();
  return {
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    description: `${siteName} — Token API AI Multi Model`,
    icons: logoUrl ? { icon: logoUrl, shortcut: logoUrl, apple: logoUrl } : undefined,
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
    <html lang="id" className={`${jakarta.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-base-bg text-base-ink antialiased font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BRAND__=${JSON.stringify({ siteName, logoUrl })};`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var c=document.documentElement.classList;d?c.add("dark"):c.remove("dark")}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
