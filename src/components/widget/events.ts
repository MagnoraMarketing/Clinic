"use client";

// Tiny event bus so any button on the page can open the AI receptionist,
// optionally with a starting message ("Book a massage tomorrow at 4pm").
export const OPEN_EVENT = "aibooking:open";

export interface OpenDetail {
  message?: string;
  voice?: boolean;
}

export function openReceptionist(message?: string, opts: { voice?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail: { message, voice: opts.voice } }));
}
