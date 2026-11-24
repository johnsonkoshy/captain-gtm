"use client";
import { useEffect, useState } from "react";

/**
 * Honesty tag for a sponsor service, driven by /api/status (no secrets).
 * - live: the adapter is running against the real service.
 * - sample: the adapter has a live path but no key here, so it runs on seed data.
 * - plan: the live path is not built yet ("In our build plan").
 */
export type Service = "llm" | "tavily" | "hunter" | "neo4j" | "flexprice" | "band" | "mailer";
type StatusMap = Partial<Record<Service, "live" | "seed">>;

const NOT_BUILT: Service[] = ["flexprice", "band"];
let cache: Promise<StatusMap> | null = null;
const load = () => (cache ??= fetch("/api/status").then((r) => r.json()).catch(() => ({})));

export function useServiceStatus() {
  const [s, setS] = useState<StatusMap>({});
  useEffect(() => { let on = true; load().then((v) => on && setS(v)); return () => { on = false; }; }, []);
  return s;
}

export function ServiceTag({ svc, name }: { svc: Service; name?: string }) {
  const s = useServiceStatus();
  const live = s[svc] === "live";
  if (live) return <span className="tag live">{name ? `${name} · live` : "Live"}</span>;
  if (NOT_BUILT.includes(svc)) return <span className="tag plan" title="Shown with sample data. The live integration is not wired yet.">{name ? `${name} · in our build plan` : "In our build plan"}</span>;
  return <span className="tag sample" title="Live path written; running on sample data in this build.">{name ? `${name} · sample data` : "Sample data"}</span>;
}
