"use client";

import type { Catalog, Clinic } from "@/lib/types";
import { ReceptionistChat } from "@/components/widget/ReceptionistChat";
import { iframeSrc, useExternalWidget } from "@/components/widget/AIbookingWidget";
import { openReceptionist } from "@/components/widget/events";
import { Icon } from "@/components/ui/Icon";

/** The central demo in the hero: the real AIbooking widget if configured, otherwise the demo receptionist. */
export function HeroWidget({ clinic, catalog }: { clinic: Clinic; catalog: Catalog }) {
  const ext = useExternalWidget(clinic);
  if (ext.mode === "iframe")
    return (
      <div className="h-[600px] overflow-hidden rounded-[28px] border border-white/10 bg-ink-900 shadow-2xl">
        <iframe title="AIbooking AI receptionist" src={iframeSrc(ext.url, clinic, ext.agentId)} className="h-full w-full" allow="microphone; autoplay" />
      </div>
    );
  if (ext.mode === "script") {
    const accent = clinic.widget.accentColor || clinic.accentColor;
    const left = clinic.widget.position === "bottom-left";
    const actions: [string, string][] = [
      ["📅", "Book a 60 min massage tomorrow afternoon"],
      ["🔄", "I need to move my appointment"],
      ["🏷️", "How much is a deep tissue massage?"],
    ];
    return (
      <div className="relative flex h-[520px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-ink-900 shadow-2xl sm:h-[600px]" style={{ ["--accent" as string]: accent }}>
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: accent }} />
        <div className="relative flex items-center gap-3 border-b border-white/8 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-2xl text-xl" style={{ background: `color-mix(in oklab, ${accent} 22%, transparent)` }}>
            {clinic.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{clinic.name}</p>
            <p className="flex items-center gap-1.5 text-xs text-ink-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> AI receptionist · online
            </p>
          </div>
          <span className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase" style={{ color: accent, background: `color-mix(in oklab, ${accent} 14%, transparent)` }}>
            Live test
          </span>
        </div>

        <div className="relative flex flex-1 flex-col justify-center px-6 text-center">
          <div className="mx-auto grid h-20 w-20 animate-float place-items-center rounded-full" style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)` }}>
            <span className="grid h-14 w-14 place-items-center rounded-full text-ink-950 shadow-lg" style={{ background: accent }}>
              <Icon name="mic" className="h-6 w-6" />
            </span>
          </div>
          <p className="h-display mt-5 text-2xl">Hi 👋 I&apos;m the AI receptionist</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-300">I can book, move or cancel your appointment – or answer questions about treatments, prices and insurance.</p>
          <div className="mx-auto mt-5 flex w-full max-w-sm flex-col gap-2">
            {actions.map(([emoji, label]) => (
              <button
                key={label}
                onClick={() => openReceptionist(label)}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-left text-sm text-ink-300 transition hover:border-[color:var(--accent)] hover:bg-white/[0.06] hover:text-white"
              >
                <span>{emoji}</span> <span className="flex-1">{label}</span>
                <Icon name="arrow" className="h-4 w-4 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        <div className="relative border-t border-white/8 px-5 py-4">
          <button onClick={() => openReceptionist()} className="btn w-full text-ink-950 shadow-lg hover:brightness-110" style={{ background: accent }}>
            <Icon name="chat" className="h-4 w-4" /> Start conversation
          </button>
          <p className="mt-2.5 text-center text-[11px] text-ink-400">{left ? "The widget sits at the bottom left of the page ↙" : "The widget sits at the bottom right of the page ↘"}</p>
        </div>
      </div>
    );
  }
  return <ReceptionistChat clinic={clinic} catalog={catalog} className="h-[560px] sm:h-[600px]" />;
}
