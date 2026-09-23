"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Catalog, Clinic } from "@/lib/types";
import { initialState, mainMenu, respond, type AssistantCard, type AssistantMessage, type AssistantState } from "@/lib/assistant/engine";
import { assistantApi } from "@/lib/client/api";
import { duration, formatDate, priceLabel, telHref } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { useSpeech } from "./useSpeech";

let seq = 0;
const uid = () => `m${Date.now()}${seq++}`;

export interface ReceptionistChatProps {
  clinic: Clinic;
  catalog: Catalog;
  /** Start with a specific message, e.g. "Book a massage" from a button. */
  autoStart?: string;
  /** Start directly in voice mode (requires browser support). */
  autoVoice?: boolean;
  onClose?: () => void;
  className?: string;
}

/**
 * The demo edition of the AIbooking receptionist (chat + voice). Shown when the real
 * AIbooking widget isn't configured. Bookings, rebookings and cancellations go
 * through the real API and land in the admin calendar.
 */
export function ReceptionistChat({ clinic, catalog, autoStart, autoVoice, onClose, className = "" }: ReceptionistChatProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [{ id: uid(), role: "assistant", text: clinic.widget.welcomeMessage, quickReplies: mainMenu() }]);
  const [state, setState] = useState<AssistantState>(initialState);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const busy = useRef(false);
  const accent = clinic.widget.accentColor || clinic.accentColor;

  const ctx = useMemo(
    () => ({
      clinic,
      catalog,
      source: "chat" as const,
      api: {
        availability: assistantApi.availability,
        createAppointment: assistantApi.createAppointment,
        lookup: (reference: string, phone: string) => assistantApi.lookup(clinic.id, reference, phone),
        updateAppointment: assistantApi.updateAppointment,
      },
    }),
    [clinic, catalog],
  );

  const speechRef = useRef<ReturnType<typeof useSpeech> | null>(null);

  const send = useCallback(
    async (text: string, viaVoice = false, display?: string) => {
      const clean = text.trim();
      if (!clean || busy.current) return;
      if (clean === "__admin__") {
        window.open("/admin/appointments", "_blank");
        return;
      }
      busy.current = true;
      setInput("");
      setMessages((m) => [...m.map((x) => ({ ...x, quickReplies: undefined })), { id: uid(), role: "user", text: display ?? clean }]);
      setTyping(true);
      const started = Date.now();
      let res: Awaited<ReturnType<typeof respond>>;
      try {
        res = await respond({ ...ctx, source: viaVoice ? "voice" : "chat" }, stateRef.current, clean);
      } catch {
        res = { state: stateRef.current, replies: [{ text: `Sorry, something went wrong on my side. You can always call us on ${clinic.phone}.`, card: { type: "call", phone: clinic.phone } }] };
      }
      await new Promise((r) => setTimeout(r, Math.max(0, 550 - (Date.now() - started))));
      setTyping(false);
      setState(res.state);
      setMessages((m) => [...m, ...res.replies.map((r) => ({ ...r, id: uid(), role: "assistant" as const }))]);
      busy.current = false;
      if (viaVoice && speechRef.current) {
        const sp = speechRef.current;
        sp.speak(res.replies.map((r) => r.text).join(" "), () => sp.start());
      }
    },
    [ctx, clinic.phone],
  );

  const speech = useSpeech((text) => send(text, true));
  speechRef.current = speech;

  useEffect(() => {
    if (autoStart) send(autoStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, speech.interim]);

  const toggleVoice = () => {
    if (voiceMode) {
      speech.stop();
      window.speechSynthesis?.cancel();
      setVoiceMode(false);
      return;
    }
    setVoiceMode(true);
    const intro = `Hi, you're speaking with the AI receptionist at ${clinic.name}. How can I help?`;
    setMessages((m) => [...m, { id: uid(), role: "assistant", text: `🎙️ ${intro}` }]);
    speech.speak(intro, () => speech.start());
  };

  useEffect(() => {
    if (autoVoice && speech.supported && !voiceMode) toggleVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoVoice, speech.supported]);

  const last = messages[messages.length - 1];

  return (
    <div className={`flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-ink-900 shadow-2xl shadow-black/60 ${className}`} style={{ ["--accent" as string]: accent }}>
      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-white/8 bg-gradient-to-r from-ink-850 to-ink-900 px-4 py-3.5">
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg" style={{ background: `color-mix(in oklab, ${accent} 22%, transparent)` }}>
          {clinic.emoji}
          <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{clinic.name}</p>
          <p className="truncate text-xs text-ink-400">AI receptionist · answers instantly</p>
        </div>
        {speech.supported && (
          <button
            onClick={toggleVoice}
            className={`grid h-9 w-9 place-items-center rounded-full border transition ${voiceMode ? "border-transparent text-ink-950" : "border-white/10 text-ink-300 hover:text-white"}`}
            style={voiceMode ? { background: accent } : undefined}
            title={voiceMode ? "Stop voice" : "Talk to the AI"}
            aria-label={voiceMode ? "Stop voice" : "Talk to the AI"}
          >
            <Icon name="mic" className="h-4.5 w-4.5" />
          </button>
        )}
        <a href={telHref(clinic.phone)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-ink-300 transition hover:text-white" title="Call" aria-label="Call the clinic">
          <Icon name="phone" className="h-4 w-4" />
        </a>
        {onClose && (
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-ink-300 hover:bg-white/5 hover:text-white" aria-label="Close">
            <Icon name="close" className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-[340px] flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex animate-pop ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[88%] space-y-2">
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${m.role === "user" ? "rounded-br-md text-ink-950" : "rounded-bl-md bg-ink-800 text-white/90"}`}
                style={m.role === "user" ? { background: accent } : undefined}
              >
                {m.text}
              </div>
              {m.card && <Card card={m.card} accent={accent} clinic={clinic} />}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-ink-800 px-4 py-3" aria-label="Typing">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
        {speech.interim && <div className="ml-auto w-fit max-w-[80%] rounded-2xl px-3.5 py-2 text-sm text-white/60 italic ring-1 ring-white/10">{speech.interim}…</div>}
        {!typing && last?.quickReplies && last.quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {last.quickReplies.map((q) => (
              <button
                key={q.label}
                onClick={() => send(q.value, false, q.label)}
                className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[13px] font-medium text-white/90 transition hover:border-[var(--accent)] hover:bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      {voiceMode ? (
        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3.5">
          <button onClick={() => (speech.listening ? speech.stop() : speech.start())} className="relative grid h-12 w-12 place-items-center rounded-full text-ink-950" style={{ background: accent }} aria-label={speech.listening ? "Stop listening" : "Talk"}>
            {speech.listening && <span className="absolute inset-0 animate-pulse-ring rounded-full" />}
            <Icon name="mic" className="h-5 w-5" />
          </button>
          <p className="flex-1 text-sm text-ink-300">{speech.listening ? "I'm listening… just speak naturally" : "Tap the microphone to talk"}</p>
          <button onClick={toggleVoice} className="text-xs font-semibold text-ink-400 hover:text-white">
            Type instead
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-white/8 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. “Can I move my appointment to Friday?”"
            className="min-w-0 flex-1 rounded-full bg-ink-850 px-4 py-2.5 text-[14px] outline-none placeholder:text-ink-400 focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
            aria-label="Message to the AI receptionist"
          />
          <button type="submit" disabled={!input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-950 transition disabled:opacity-40" style={{ background: accent }} aria-label="Send">
            <Icon name="send" className="h-4.5 w-4.5" />
          </button>
        </form>
      )}
      <p className="border-t border-white/5 bg-ink-950/60 py-1.5 text-center text-[10.5px] tracking-wide text-ink-400">
        Powered by <span className="font-semibold text-white/70">AIbooking</span> · Demo
      </p>
    </div>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-emerald-400/15 text-emerald-300" },
  pending: { label: "Awaiting clinic", cls: "bg-amber-400/15 text-amber-300" },
  cancelled: { label: "Cancelled", cls: "bg-red-400/15 text-red-300" },
  checked_in: { label: "Checked in", cls: "bg-sky-400/15 text-sky-300" },
  completed: { label: "Completed", cls: "bg-white/8 text-ink-300" },
  no_show: { label: "No-show", cls: "bg-white/8 text-ink-300" },
};

function Card({ card, accent, clinic }: { card: AssistantCard; accent: string; clinic: Clinic }) {
  if (card.type === "summary")
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-850 p-3 text-[13px]">
        {card.lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-3 py-1">
            <span className="text-ink-300">{l.label}</span>
            <span className="text-right font-medium text-white/90">{l.value}</span>
          </div>
        ))}
        {card.note && <p className="mt-1.5 border-t border-white/10 pt-2 text-[11.5px] text-ink-400">{card.note}</p>}
      </div>
    );
  if (card.type === "prices")
    return (
      <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-ink-850 text-[13px]">
        {card.services.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0">
              <span className="mr-1.5">{s.emoji}</span>
              <span className="text-white/90">{s.name}</span>
              <span className="block pl-6 text-[11px] text-ink-400">{duration(s.durationMinutes)}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{priceLabel(s)}</span>
          </div>
        ))}
      </div>
    );
  if (card.type === "appointment") {
    const a = card.appointment;
    const st = STATUS[a.status] ?? STATUS.confirmed;
    return (
      <div className="overflow-hidden rounded-2xl border bg-ink-850 text-[13px]" style={{ borderColor: `color-mix(in oklab, ${accent} 35%, transparent)` }}>
        <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: `color-mix(in oklab, ${accent} 12%, transparent)` }}>
          <span className="flex items-center gap-1.5 font-semibold">
            <Icon name={a.status === "cancelled" ? "close" : a.changes.length ? "refresh" : "check"} className="h-4 w-4" /> {card.title ?? `Appointment ${a.reference}`}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
        </div>
        <div className="space-y-0.5 p-3">
          <p className="font-medium text-white/90">{a.serviceName}</p>
          <p className={`text-white/75 ${a.status === "cancelled" ? "line-through" : ""}`}>
            {formatDate(a.date)} · {a.time}
          </p>
          <p className="text-ink-400">
            with {a.practitionerName} · {duration(a.durationMinutes)} · ref. {a.reference}
          </p>
          {a.status !== "cancelled" && (
            <Link href={`/demo/${clinic.slug}/manage?ref=${a.reference}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: accent }}>
              Manage booking <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    );
  }
  return (
    <a href={telHref(card.phone)} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-850 p-3 transition hover:border-white/25">
      <span className="grid h-9 w-9 place-items-center rounded-full text-ink-950" style={{ background: accent }}>
        <Icon name="phone" className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{card.phone}</span>
        <span className="text-xs text-ink-400">Call {clinic.name}</span>
      </span>
    </a>
  );
}
