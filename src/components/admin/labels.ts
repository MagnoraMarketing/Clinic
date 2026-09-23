import type { AppointmentSource, AppointmentStatus, CallOutcome } from "@/lib/types";

export const SOURCE: Record<AppointmentSource | "admin", { label: string; icon: string }> = {
  website: { label: "Website", icon: "🌐" },
  chat: { label: "Chat", icon: "💬" },
  voice: { label: "AI voice", icon: "🎙️" },
  phone: { label: "Phone AI", icon: "📞" },
  api: { label: "API", icon: "🔌" },
  admin: { label: "Staff", icon: "🧑‍💼" },
};

export const STATUS: Record<AppointmentStatus, { label: string; cls: string }> = {
  pending: { label: "Awaiting approval", cls: "bg-amber-400/15 text-amber-300" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-400/15 text-emerald-300" },
  checked_in: { label: "Checked in", cls: "bg-sky-400/15 text-sky-300" },
  completed: { label: "Completed", cls: "bg-white/8 text-ink-300" },
  cancelled: { label: "Cancelled", cls: "bg-red-400/15 text-red-300" },
  no_show: { label: "No-show", cls: "bg-white/8 text-ink-300" },
};

export const OUTCOME: Record<CallOutcome, { label: string; cls: string; icon: string }> = {
  booking: { label: "Booked", cls: "bg-emerald-400/15 text-emerald-300", icon: "📅" },
  rebooking: { label: "Moved", cls: "bg-sand-400/15 text-sand-300", icon: "🔄" },
  cancellation: { label: "Cancelled", cls: "bg-red-400/15 text-red-300", icon: "✕" },
  question: { label: "Question", cls: "bg-sky-400/15 text-sky-300", icon: "❓" },
  transfer: { label: "Transferred", cls: "bg-white/8 text-ink-300", icon: "↪️" },
  missed: { label: "Missed", cls: "bg-red-400/15 text-red-300", icon: "✕" },
};
