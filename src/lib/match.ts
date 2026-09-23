import type { Practitioner, Service } from "@/lib/types";

// Fuzzy matching of free text → services / practitioners. Shared by the API
// (AI Voice often sends a name like "60 min deep tissue" instead of an id) and
// by the demo receptionist in the browser.

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9æøå ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(["min", "minutes", "minute", "and", "the", "a", "an", "with", "for", "of", "under", "years", "i", "my", "&"]);
const words = (s: string) => norm(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w));
const minutesIn = (s: string) => Number(norm(s).match(/\b(\d{2,3})\s*(?:min|minutes?|m)\b/)?.[1] ?? 0) || (/\b(an|one|1) hour\b/.test(norm(s)) ? 60 : /\bhalf (an )?hour\b/.test(norm(s)) ? 30 : /\b(1 5|one and a half) hours?\b/.test(norm(s)) ? 90 : 0);

export interface ServiceMatch {
  service: Service;
  score: number;
}

/** Scores every service against the text. Aliases and exact names win; duration ("60 min") breaks ties. */
export function rankServices(text: string, services: Service[]): ServiceMatch[] {
  const t = ` ${norm(text)} `;
  const mins = minutesIn(text);
  const out: ServiceMatch[] = [];
  for (const s of services) {
    let score = 0;
    const name = norm(s.name);
    if (t.includes(` ${name} `)) score += 100;
    for (const a of s.aliases ?? []) {
      const n = norm(a);
      if (n && t.includes(` ${n} `)) score = Math.max(score, 40 + n.length);
    }
    const nameWords = words(s.name).filter((w) => !/^\d+$/.test(w));
    const hits = nameWords.filter((w) => t.includes(` ${w} `) || t.includes(` ${w}s `) || (w.endsWith("s") && t.includes(` ${w.slice(0, -1)} `)));
    if (hits.length) score = Math.max(score, 10 * hits.length + (hits.length === nameWords.length ? 15 : 0));
    if (score > 0 && mins) score += s.durationMinutes === mins ? 30 : -10;
    if (score > 0) out.push({ service: s, score });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function findService(services: Service[], ref: { serviceId?: string; name?: string }): Service | undefined {
  if (ref.serviceId) {
    const byId = services.find((s) => s.id === ref.serviceId);
    if (byId) return byId;
  }
  if (!ref.name) return undefined;
  return rankServices(ref.name, services)[0]?.service;
}

/** "with Sofie", "Dr. Juhl", "Emma" → practitioner. */
export function findPractitioner(practitioners: Practitioner[], text: string): Practitioner | undefined {
  const t = ` ${norm(text)} `;
  return practitioners.find((p) => {
    const parts = norm(p.name.replace(/^dr\.?\s+/i, "")).split(" ");
    return parts.some((part) => part.length > 2 && t.includes(` ${part} `));
  });
}

export const wantsAnyone = (text: string) => /\b(any|anyone|anybody|whoever|no preference|doesnt matter|don t mind|dont mind|first available|either)\b/.test(norm(text));
