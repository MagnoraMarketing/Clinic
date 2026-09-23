"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";
import type { Clinic } from "@/lib/types";
import { publicConfig } from "@/lib/config";
import { telHref } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/components/i18n/I18nProvider";

type Line = { id: number; role: "user" | "assistant"; text: string; final: boolean };
type Status = "idle" | "connecting" | "live" | "ended" | "error";

/**
 * Voice receptionist powered by a Vapi assistant (NEXT_PUBLIC_VAPI_PUBLIC_KEY +
 * NEXT_PUBLIC_VAPI_ASSISTANT_ID), drawn in the same design as the rest of the
 * site's receptionist widget. The Vapi SDK is only loaded when a call starts.
 */
export function VapiVoice({ clinic, autoStart, onClose, className = "" }: { clinic: Clinic; autoStart?: boolean; onClose?: () => void; className?: string }) {
  const t = useT();
  const accent = clinic.widget.accentColor || clinic.accentColor;
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const vapiRef = useRef<Vapi | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const addTranscript = useCallback((role: "user" | "assistant", text: string, final: boolean) => {
    setLines((prev) => {
      const last = prev[prev.length - 1];
      // Partial transcripts update the open bubble of the same speaker
      if (last && last.role === role && !last.final) return [...prev.slice(0, -1), { ...last, text, final }];
      return [...prev, { id: seq.current++, role, text, final }];
    });
  }, []);

  const start = useCallback(async () => {
    if (status === "connecting" || status === "live") return;
    setError("");
    setStatus("connecting");
    try {
      const { default: VapiClient } = await import("@vapi-ai/web");
      const vapi = vapiRef.current ?? new VapiClient(publicConfig.vapiPublicKey);
      if (!vapiRef.current) {
        vapi.on("call-start", () => setStatus("live"));
        vapi.on("call-end", () => {
          setStatus("ended");
          setSpeaking(false);
        });
        vapi.on("speech-start", () => setSpeaking(true));
        vapi.on("speech-end", () => setSpeaking(false));
        vapi.on("message", (m: { type?: string; role?: string; transcript?: string; transcriptType?: string }) => {
          if (m.type === "transcript" && m.transcript && (m.role === "user" || m.role === "assistant")) addTranscript(m.role, m.transcript, m.transcriptType === "final");
        });
        vapi.on("error", (e: unknown) => {
          console.error("[vapi]", e);
          setError(t("The call could not be connected. Please try again."));
          setStatus("error");
        });
        vapiRef.current = vapi;
      }
      await vapi.start(publicConfig.vapiAssistantId);
    } catch (e) {
      console.error("[vapi] start failed", e);
      setError(t("The call could not be connected. Please try again."));
      setStatus("error");
    }
  }, [status, addTranscript, t]);

  const stop = useCallback(() => {
    vapiRef.current?.stop();
    setStatus("ended");
  }, []);

  useEffect(() => {
    if (autoStart) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => () => void vapiRef.current?.stop(), []);

  useEffect(() => {
    if (status !== "live") return;
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const live = status === "live";
  const statusText =
    status === "connecting"
      ? t("Connecting…")
      : live
        ? speaking
          ? t("The receptionist is speaking…")
          : t("I'm listening… just speak naturally")
        : status === "ended"
          ? t("Call ended – tap to call again")
          : status === "error"
            ? error
            : t("Tap the microphone to talk");

  return (
    <div className={`flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-ink-900 shadow-2xl shadow-black/60 ${className}`} style={{ ["--accent" as string]: accent }}>
      <div className="relative flex items-center gap-3 border-b border-white/8 bg-gradient-to-r from-ink-850 to-ink-900 px-4 py-3.5">
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg" style={{ background: `color-mix(in oklab, ${accent} 22%, transparent)` }}>
          {clinic.emoji}
          <span className="absolute -end-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-ink-900 bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{clinic.name}</p>
          <p className="truncate text-xs text-ink-400">{live ? `${t("AI receptionist · on the line")} · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : t("AI receptionist · voice")}</p>
        </div>
        <a href={telHref(clinic.phone)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-ink-300 transition hover:text-white" title={t("Call")} aria-label={t("Call the clinic")}>
          <Icon name="phone" className="h-4 w-4" />
        </a>
        {onClose && (
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-ink-300 hover:bg-white/5 hover:text-white" aria-label={t("Close")}>
            <Icon name="close" className="h-5 w-5" />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="min-h-[300px] flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <p className="h-display text-2xl">{t("Hi 👋 I'm the AI receptionist")}</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-ink-300">{t("Talk to me like you would on the phone – book, move or cancel an appointment, or ask about treatments and prices.")}</p>
          </div>
        ) : (
          lines.map((l) => (
            <div key={l.id} className={`flex animate-pop ${l.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${l.role === "user" ? "rounded-ee-md text-ink-950" : "rounded-es-md bg-ink-800 text-white/90"} ${l.final ? "" : "opacity-70"}`}
                style={l.role === "user" ? { background: accent } : undefined}
              >
                {l.text}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-white/8 px-4 py-3.5">
        <button
          onClick={live || status === "connecting" ? stop : start}
          className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full ${live ? "bg-red-400 text-ink-950" : "text-ink-950"}`}
          style={live ? undefined : { background: accent }}
          aria-label={live ? t("End call") : t("Start call")}
        >
          {(live || status === "connecting") && <span className="absolute inset-0 animate-pulse-ring rounded-full" />}
          <Icon name={live ? "close" : "mic"} className="h-5 w-5" />
        </button>
        <p className={`flex-1 text-sm ${status === "error" ? "text-red-300" : "text-ink-300"}`}>{statusText}</p>
        {live && (
          <button
            onClick={() => {
              vapiRef.current?.setMuted(!muted);
              setMuted(!muted);
            }}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink-300 hover:text-white"
          >
            {muted ? t("Unmute") : t("Mute")}
          </button>
        )}
      </div>
      <p className="border-t border-white/5 bg-ink-950/60 py-1.5 text-center text-[10.5px] tracking-wide text-ink-400">
        {t("Powered by")} <span className="font-semibold text-white/70">AIbooking</span>
      </p>
    </div>
  );
}
