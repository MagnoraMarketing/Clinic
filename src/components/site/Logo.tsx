"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";

export function Logo({ href = "/", sub = true }: { href?: string; sub?: boolean }) {
  const t = useT();
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5 whitespace-nowrap" aria-label={t("AIbooking Clinic – home")}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sage-300 to-sage-600 shadow-lg shadow-sage-600/25">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#07110f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 18 12 5l6 13M8.3 13.5h7.4" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-bold tracking-tight">
          AIbooking <span className="text-sage-400">Clinic</span>
        </span>
        {sub && <span className="mt-0.5 block text-[10.5px] font-medium tracking-wide text-ink-400">{t("AI receptionist for clinics")}</span>}
      </span>
    </Link>
  );
}
