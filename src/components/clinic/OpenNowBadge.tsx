"use client";

import { useEffect, useState } from "react";
import type { Clinic } from "@/lib/types";
import { isOpenNow } from "@/lib/hours";
import { useT } from "@/components/i18n/I18nProvider";

/** Client-side so "open now" is computed without a hydration mismatch. */
export function OpenNowBadge({ clinic }: { clinic: Clinic }) {
  const t = useT();
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => setOpen(isOpenNow(clinic)), [clinic]);
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold backdrop-blur">
      <span className={`h-2 w-2 rounded-full ${open === null ? "bg-ink-400" : open ? "bg-emerald-400" : "bg-red-400"}`} />
      {open === null ? t(clinic.tagline) : open ? `${t("Open now")} · ${t(clinic.tagline)}` : t("Closed now · book online or ask our AI receptionist 24/7")}
    </span>
  );
}
