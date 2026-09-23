"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Catalog, Clinic } from "@/lib/types";
import { api } from "@/lib/client/api";

interface AdminCtx {
  clinics: Clinic[];
  clinic: Clinic | null;
  catalog: Catalog | null;
  select(slug: string): void;
  refreshClinic(): Promise<void>;
  refreshCatalog(): Promise<void>;
}

const Ctx = createContext<AdminCtx | null>(null);
const KEY = "aibooking-admin-clinic";

/** Multi-tenant: the admin always works on one selected clinic at a time. */
export function AdminProvider({ initial, children }: { initial: Clinic[]; children: React.ReactNode }) {
  const [clinics, setClinics] = useState(initial);
  const [slug, setSlug] = useState(initial[0]?.slug ?? "");
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && initial.some((c) => c.slug === saved)) setSlug(saved);
    } catch {
      /* ignore */
    }
  }, [initial]);

  const select = (s: string) => {
    setSlug(s);
    try {
      localStorage.setItem(KEY, s);
    } catch {
      /* ignore */
    }
  };

  const clinic = clinics.find((c) => c.slug === slug) ?? clinics[0] ?? null;

  const refreshCatalog = useCallback(async () => {
    if (!clinic) return;
    setCatalog(await api<Catalog>(`/api/clinics/${clinic.id}/services`));
  }, [clinic]);

  useEffect(() => {
    setCatalog(null);
    refreshCatalog().catch(() => undefined);
  }, [refreshCatalog]);

  const refreshClinic = useCallback(async () => {
    setClinics(await api<Clinic[]>("/api/clinics"));
  }, []);

  return <Ctx.Provider value={{ clinics, clinic, catalog, select, refreshClinic, refreshCatalog }}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin requires AdminProvider");
  return c;
}

/** Polling hook for live data in the admin. */
export function usePoll<T>(path: string | null, intervalMs = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    const load = () =>
      api<T>(path)
        .then((d) => {
          if (alive) {
            setData(d);
            setError("");
          }
        })
        .catch((e) => alive && setError(e.message));
    load();
    const t = intervalMs > 0 ? setInterval(load, intervalMs) : undefined;
    return () => {
      alive = false;
      if (t) clearInterval(t);
    };
  }, [path, intervalMs, tick]);
  return { data, error, reload: () => setTick((n) => n + 1), setData };
}
