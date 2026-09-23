"use client";

import { useEffect, useState } from "react";
import type { Catalog, Clinic } from "@/lib/types";
import { publicConfig } from "@/lib/config";
import { Icon } from "@/components/ui/Icon";
import { ReceptionistChat } from "./ReceptionistChat";
import { OPEN_EVENT, type OpenDetail } from "./events";

const SCRIPT_ID = "aibooking-widget-script";

declare global {
  interface Window {
    AIbookingConfig?: Record<string, unknown>;
    AIbooking?: { open?: (opts?: { message?: string }) => void; close?: () => void };
    /** API exposed by aibooking-backend widget.js */
    aibooking?: { open?: () => void; close?: () => void; toggle?: () => void };
  }
}

/** Resolve agent id: the clinic's own agent → the platform default (NEXT_PUBLIC_AIBOOKING_AGENT_ID). */
export function resolveAgentId(c: Clinic) {
  return c.widget.chatAgentId || c.widget.agentId || publicConfig.agentId;
}

/** External widget = the real AIbooking Voice/Chat. Script (.js) or iframe URL. */
export function useExternalWidget(c: Clinic) {
  const url = publicConfig.widgetUrl;
  const mode: "script" | "iframe" | null = !url ? null : /\.m?js(\?|$)/.test(url) ? "script" : "iframe";
  return { url, mode, agentId: resolveAgentId(c) };
}

export function iframeSrc(url: string, c: Clinic, agentId: string) {
  const u = new URL(url);
  u.searchParams.set("agentId", agentId);
  u.searchParams.set("clinicId", c.id);
  if (c.widget.voiceAgentId) u.searchParams.set("voiceAgentId", c.widget.voiceAgentId);
  if (publicConfig.apiUrl) u.searchParams.set("apiUrl", publicConfig.apiUrl);
  u.searchParams.set("theme", c.widget.theme);
  u.searchParams.set("language", "en");
  return u.toString();
}

/**
 * Floating AI receptionist (bottom right). Configured per clinic
 * (clinic.widget: agent ids, theme, welcome, position, enabled).
 *  - NEXT_PUBLIC_AIBOOKING_WIDGET_URL = *.js → the AIbooking script is loaded with data attributes
 *    (data-widget-id from NEXT_PUBLIC_AIBOOKING_WIDGET_ID). Default is the AIbooking test widget.
 *  - NEXT_PUBLIC_AIBOOKING_WIDGET_URL = other URL → shown as an iframe in the panel.
 *  - Set to an empty string → built-in demo receptionist (chat + voice in the browser).
 */
export function AIbookingWidget({ clinic, catalog }: { clinic: Clinic; catalog: Catalog }) {
  const [open, setOpen] = useState(false);
  const [autoStart, setAutoStart] = useState<string | undefined>();
  const [autoVoice, setAutoVoice] = useState(false);
  const [session, setSession] = useState(0);
  const [hint, setHint] = useState(false);
  const ext = useExternalWidget(clinic);
  const accent = clinic.widget.accentColor;
  const left = clinic.widget.position === "bottom-left";

  // Load the real AIbooking widget script (once per page – the script draws its own button)
  useEffect(() => {
    if (ext.mode !== "script" || !clinic.widget.enabled) return;
    window.AIbookingConfig = {
      widgetId: publicConfig.widgetId || undefined,
      agentId: ext.agentId,
      voiceAgentId: clinic.widget.voiceAgentId,
      clinicId: clinic.id,
      apiUrl: publicConfig.apiUrl || window.location.origin,
      theme: clinic.widget.theme,
      accentColor: accent,
      welcomeMessage: clinic.widget.welcomeMessage,
      position: clinic.widget.position,
      language: "en",
    };
    if (document.getElementById(SCRIPT_ID)) return;
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = ext.url;
    s.async = true;
    if (publicConfig.widgetId) s.dataset.widgetId = publicConfig.widgetId;
    if (ext.agentId) s.dataset.agentId = ext.agentId;
    s.dataset.clinicId = clinic.id;
    s.dataset.language = "en";
    if (publicConfig.apiUrl) s.dataset.apiUrl = publicConfig.apiUrl;
    document.body.appendChild(s);
  }, [ext.mode, ext.url, ext.agentId, clinic, accent]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail ?? {};
      const msg = detail.message;
      if (ext.mode === "script") {
        if (window.aibooking?.open) window.aibooking.open();
        else if (window.AIbooking?.open) window.AIbooking.open({ message: msg });
        else setHint(true);
        return;
      }
      setAutoStart(msg);
      setAutoVoice(Boolean(detail.voice));
      setSession((n) => n + (msg || detail.voice ? 1 : 0));
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, [ext.mode]);

  // Briefly show a "try me" bubble next to the test widget, so visitors see where it is
  useEffect(() => {
    if (ext.mode !== "script" || !clinic.widget.enabled) return;
    const show = setTimeout(() => setHint(true), 2500);
    return () => clearTimeout(show);
  }, [ext.mode, clinic.widget.enabled]);
  useEffect(() => {
    if (!hint) return;
    const hide = setTimeout(() => setHint(false), 9000);
    return () => clearTimeout(hide);
  }, [hint]);

  if (!clinic.widget.enabled) return null;
  if (ext.mode === "script")
    return hint ? (
      <div role="status" className={`pointer-events-auto fixed bottom-24 z-[60] w-[min(18rem,calc(100vw-2rem))] animate-pop ${left ? "left-4 sm:left-6" : "right-4 sm:right-6"}`}>
        <div className="relative rounded-2xl border border-white/10 bg-ink-900/95 p-4 pr-9 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <button onClick={() => setHint(false)} aria-label="Close" className="absolute top-3 right-3 text-ink-400 hover:text-white">
            <Icon name="close" className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-2 text-[11px] font-bold tracking-wide uppercase" style={{ color: accent }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accent }} /> Live test
          </p>
          <p className="mt-1.5 text-sm font-semibold">Try the AI receptionist here</p>
          <p className="mt-1 text-xs text-ink-300">Click the button below and talk to the receptionist – book, move or cancel an appointment, or ask about prices.</p>
          <span className={`absolute -bottom-1.5 h-3 w-3 rotate-45 border-r border-b border-white/10 bg-ink-900 ${left ? "left-8" : "right-8"}`} />
        </div>
      </div>
    ) : null;

  return (
    <div className={`fixed bottom-4 z-50 ${left ? "left-4 sm:left-6" : "right-4 sm:right-6"} sm:bottom-6`}>
      {open && (
        <div className={`fixed inset-x-2 top-16 bottom-2 animate-pop sm:absolute sm:inset-auto sm:bottom-20 ${left ? "sm:left-0" : "sm:right-0"} sm:h-[620px] sm:max-h-[calc(100vh-8rem)] sm:w-[400px]`}>
          {ext.mode === "iframe" ? (
            <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-ink-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                <span className="text-sm font-semibold">{clinic.name} · AI receptionist</span>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-300 hover:text-white">
                  <Icon name="close" />
                </button>
              </div>
              <iframe title="AIbooking" src={iframeSrc(ext.url, clinic, ext.agentId)} className="flex-1" allow="microphone; autoplay" />
            </div>
          ) : (
            <ReceptionistChat key={session} clinic={clinic} catalog={catalog} autoStart={autoStart} autoVoice={autoVoice} onClose={() => setOpen(false)} className="h-full" />
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="group relative flex h-14 items-center gap-2 rounded-full pr-5 pl-4 font-semibold text-ink-950 shadow-2xl shadow-black/50 transition hover:scale-[1.03]"
        style={{ background: accent, ["--accent" as string]: accent }}
        aria-expanded={open}
        aria-label="Open the AI receptionist"
      >
        {!open && <span className="absolute inset-0 animate-pulse-ring rounded-full" />}
        <Icon name={open ? "close" : "chat"} className="h-6 w-6" />
        <span className="hidden text-sm sm:inline">{open ? "Close" : "Ask the AI receptionist"}</span>
      </button>
    </div>
  );
}
