"use client";

import { LangProvider, useLang, useT, type Lang } from "@/lib/lang";

/** Provider bahasa untuk area reseller + dashboard member. */
export function ResLangProvider({ children }: { children: React.ReactNode }) {
  return <LangProvider>{children}</LangProvider>;
}

/** Toggle ID/EN ala navbar marketing. */
export function LangSwitch() {
  const { lang, setLang } = useLang();
  const t = useT();
  const next: Lang = lang === "id" ? "en" : "id";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      className="rounded-neo border border-base-line bg-base-bg px-2.5 py-1.5 text-[10px] font-black uppercase shadow-neo-sm transition-colors hover:bg-accent-sky/30"
      aria-label={lang === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
      title={lang === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
    >
      {lang === "id" ? "ID · EN" : "EN · ID"}
    </button>
  );
}
