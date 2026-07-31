import { Navbar } from "@/components/shared/navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="w-full px-4 py-10 sm:px-6 lg:px-10">{children}</main>
    </>
  );
}
