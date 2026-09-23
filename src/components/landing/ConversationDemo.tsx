"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { CallLine } from "@/lib/demo/catalog";

const DEFAULT_SCRIPT: CallLine[] = [
  { who: "Caller", text: "Hi, I have a massage booked on Thursday but I need to move it." },
  { who: "AI", text: "No problem. What's your booking reference or the phone number you booked with?" },
  { who: "Caller", text: "It's 22 33 44 55." },
  { who: "AI", text: "Found it – deep tissue with Sofie, Thursday at 16:00. Which day suits you better?" },
  { who: "Caller", text: "Could I come Friday morning instead?" },
  { who: "AI", text: "Sofie is free Friday at 09:30 or 11:15. Which one?" },
  { who: "Caller", text: "Half past nine, please." },
];

/** Animated call that ends in a result card – starts when scrolled into view. */
export function ConversationDemo({
  script: SCRIPT = DEFAULT_SCRIPT,
  title = "Inbound call · Calm Hands Massage",
  doneTitle = "Appointment moved ✓",
  doneText = "Deep tissue massage 60 min · Friday 09:30 with Sofie · ref. CA-4217",
  doneNote = "Updated in the calendar – and the client gets a new text confirmation.",
}: {
  script?: CallLine[];
  title?: string;
  doneTitle?: string;
  doneText?: string;
  doneNote?: string;
} = {}) {
  const t = useT();
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setStep(0);
    let i = 0;
    const tick = () => {
      i++;
      setStep(i);
      if (i <= SCRIPT.length) timer.current = setTimeout(tick, 1200);
    };
    timer.current = setTimeout(tick, 400);
  }, [SCRIPT.length]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [play]);

  const done = step > SCRIPT.length;
  return (
    <div ref={ref} className="card relative overflow-hidden p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="relative grid h-10 w-10 place-items-center rounded-full bg-sage-500/15 text-sage-300">
          <Icon name="phone" className="h-4.5 w-4.5" />
          {!done && <span className="absolute inset-0 animate-pulse-ring rounded-full" />}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">{t(title)}</p>
          <p className="text-xs text-ink-400">{t("AI receptionist answering")} · 00:{String(Math.min(step * 6, 59)).padStart(2, "0")}</p>
        </div>
        <button onClick={play} className="btn-ghost !px-3 !py-1.5 text-xs">
          ↻ {t("Replay")}
        </button>
      </div>
      <div className="min-h-[340px] space-y-3">
        {SCRIPT.slice(0, step).map((m, i) => (
          <div key={i} className={`flex animate-pop ${m.who === "Caller" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.who === "Caller" ? "rounded-es-md bg-ink-800" : "rounded-ee-md bg-sage-400 text-ink-950"}`}>
              <span className={`mb-0.5 block text-[10px] font-bold tracking-wider uppercase ${m.who === "Caller" ? "text-ink-400" : "text-ink-950/60"}`}>{t(m.who)}</span>
              {t(m.text)}
            </div>
          </div>
        ))}
        {done && (
          <div className="animate-pop rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <p className="flex items-center gap-2 font-semibold text-emerald-300">
              <Icon name="check" className="h-5 w-5" /> {t(doneTitle)}
            </p>
            <p className="mt-1 text-sm text-white/80">{t(doneText)}</p>
            <p className="mt-1 text-xs text-ink-400">{t(doneNote)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
