import "server-only";
import { env, type AdapterMode } from "../env";
import { leads as seedLeads, dropped as seedDropped } from "@/seed";
import { requireSources } from "../rules";
import type { Dropped, ICP, Lead, Signal } from "../types";

/** Tavily: web search that returns source URLs. Seed mode returns the fictional leads. */
export const mode = (): AdapterMode => (env.tavilyKey ? "live" : "seed");

export interface DiscoveryResult { leads: Lead[]; dropped: Dropped[]; searchHits: Signal[]; mode: AdapterMode }

export async function discover(icp: ICP): Promise<DiscoveryResult> {
  const leads = requireSources(seedLeads.filter((l) => l.fromThisRun));
  if (mode() === "seed") return { leads, dropped: seedDropped, searchHits: [], mode: "seed" };

  // Live path (written, untested without a key): search each trigger, keep only hits with a URL.
  // Turning hits into structured leads is the LLM adapter's job; until that is wired,
  // hits are returned alongside the seed leads so the demo stays on fictional people.
  const hits: Signal[] = [];
  for (const t of icp.triggers) {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.tavilyKey}` },
      body: JSON.stringify({ query: `${t.label} ${icp.industries[0]?.label ?? ""}`, max_results: 5 }),
    });
    if (!res.ok) continue;
    const json = (await res.json()) as { results?: { title: string; url: string }[] };
    for (const r of json.results ?? []) if (r.url) hits.push({ text: r.title, when: "today", source: { url: r.url } });
  }
  return { leads, dropped: seedDropped, searchHits: hits, mode: "live" };
}
