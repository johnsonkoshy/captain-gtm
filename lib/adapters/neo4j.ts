import "server-only";
import neo4j from "neo4j-driver";
import { env, type AdapterMode } from "../env";
import { seedGraph, warmPaths } from "@/seed";
import type { Graph, Lead, NodeLabel, WarmPath } from "../types";

/** Neo4j AuraDB: the knowledge graph. Seed mode builds the same graph in memory. */
export const mode = (): AdapterMode => (env.neo4jUri && env.neo4jUser && env.neo4jPassword ? "live" : "seed");

export const WARM_INTRO_QUERY = `MATCH (me:Person {team: true})
  -[:previously_employed_at]->(past:Company)
  <-[:previously_employed_at]-(buyer:Person)
  -[:works_at]->(lead:Company)
WHERE (lead)-[:matched_to]->(:Product {name: "Captain"})
RETURN me.name AS teammate, past.name AS pastEmployer, buyer.name AS buyer, lead.domain AS domain, lead.name AS company`;

function driver() {
  return neo4j.driver(env.neo4jUri!, neo4j.auth.basic(env.neo4jUser!, env.neo4jPassword!));
}

export function shape(g: Graph): Record<NodeLabel, number> {
  const out = { Company: 0, Person: 0, Product: 0, Competitor: 0, Signal: 0 } as Record<NodeLabel, number>;
  for (const n of g.nodes) out[n.label]++;
  return out;
}

/** Write leads into the graph. Returns the graph shape. */
export async function writeLeads(leads: Lead[]): Promise<Graph> {
  const g = seedGraph(leads);
  if (mode() === "seed") return g;
  // Live path (written, untested without a key): MERGE every node and edge.
  const d = driver();
  const s = d.session();
  try {
    for (const n of g.nodes) {
      await s.run(`MERGE (x:${n.label} {id: $id}) SET x += $props`, { id: n.id, props: n.props });
    }
    for (const e of g.edges) {
      await s.run(`MATCH (a {id: $from}), (b {id: $to}) MERGE (a)-[:${e.type}]->(b)`, e);
    }
  } finally { await s.close(); await d.close(); }
  return g;
}

export async function findWarmIntros(leads: Lead[]): Promise<WarmPath[]> {
  if (mode() === "seed") return warmPaths;
  const d = driver();
  const s = d.session();
  try {
    const r = await s.run(WARM_INTRO_QUERY);
    return r.records.map((rec) => {
      const domain = rec.get("domain") as string;
      return {
        teammate: rec.get("teammate"), pastEmployer: rec.get("pastEmployer"), buyer: rec.get("buyer"),
        company: rec.get("company"), leadId: leads.find((l) => l.company.domain === domain)?.id ?? domain,
      };
    });
  } finally { await s.close(); await d.close(); }
}
