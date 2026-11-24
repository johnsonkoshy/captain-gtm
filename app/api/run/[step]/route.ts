import { NextResponse } from "next/server";
import * as llm from "@/lib/adapters/llm";
import * as tavily from "@/lib/adapters/tavily";
import * as hunter from "@/lib/adapters/hunter";
import * as graph from "@/lib/adapters/neo4j";
import * as flexprice from "@/lib/adapters/flexprice";
import * as band from "@/lib/adapters/band";
import { competitors, icp as seedIcp, leads as seedLeads } from "@/seed";
import { RuleError } from "@/lib/rules";
import { PRICES, WALLET, type Event, type ICP, type Intake, type Lead, type Message, type RoomPost } from "@/lib/types";

// Stateless: input in, adapter results plus Event records out. Run state lives in the client.
const ev = (actor: Event["actor"], action: string, cost?: number): Event => ({ at: new Date().toISOString(), actor, action, cost });
const count = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean).length;

export async function POST(req: Request, { params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const body = (await req.json().catch(() => ({}))) as { intake?: Intake; icp?: ICP; leads?: Lead[]; used?: number; wallet?: number };
  const used = Number(body.used ?? 0);
  const wallet = Number(body.wallet ?? WALLET);
  try {
    switch (step) {
      case "icp": {
        const intake = body.intake!;
        const icp = await llm.draftIcp(intake);
        const priced = intake.pricing.trim() && !intake.pricing.includes("[");
        const nc = count(intake.customers);
        return NextResponse.json({
          icp,
          events: [
            ev("person:You", "Submitted the intake for Captain."),
            ev("agent:planner", `Read the intake: ${count(intake.features)} features, ${nc} current customer${nc === 1 ? "" : "s"}, ${priced ? "pricing given" : "no price yet"}.`),
            ev("agent:planner", `Wrote the ICP: ${icp.industries.length} industries, ${icp.sizeBands.length} size bands, ${icp.personas.length} personas, ${icp.triggers.length} trigger events.`),
            ev("agent:planner", `Suggested ${icp.expansions.length} expansion segments for you to review.`),
          ],
        });
      }
      case "discovery": {
        const icp = body.icp ?? seedIcp;
        const found = await tavily.discover(icp);
        const { leads, enriched, paused, cost } = await enrichWithinCredits(found.leads, used, wallet);
        const g = await graph.writeLeads(leads);
        const ver = leads.filter((l) => l.enrichment === "done" && l.person.emailStatus === "verified").length;
        const sigs = leads.reduce((a, l) => a + l.signals.length, 0);
        return NextResponse.json({
          leads, dropped: found.dropped, competitors, graphShape: graph.shape(g), cost, enriched, paused,
          events: [
            ev("agent:builder", `Searched public pages for the ${icp.triggers.length} trigger events.`),
            ev("agent:builder", `Kept ${leads.length} accounts, each with a source link. Dropped ${found.dropped.length} for negative signals.`),
            ev("agent:builder", `Wrote ${leads.length} companies, ${leads.length} people and ${sigs} signals to the graph.`),
            ...(enriched ? [ev("agent:builder", `Enriched ${enriched} contacts with Hunter: ${ver} verified, ${enriched - ver} unverified.`, cost)] : []),
            ...(paused ? [pausedEvent(paused)] : []),
          ],
        });
      }
      case "enrich": {
        // Resume enrichment for leads the credit gate paused, after a top-up.
        const waiting = (body.leads ?? []).filter((l) => l.enrichment === "paused");
        const { leads, enriched, paused, cost } = await enrichWithinCredits(waiting, used, wallet);
        const ver = leads.filter((l) => l.enrichment === "done" && l.person.emailStatus === "verified").length;
        return NextResponse.json({
          leads, enriched, paused, cost,
          events: [
            ...(enriched ? [ev("agent:builder", `Resumed enrichment: ${enriched} more contact${enriched === 1 ? "" : "s"}, ${ver} verified.`, cost)] : []),
            ...(paused ? [pausedEvent(paused)] : []),
          ],
        });
      }
      case "graph": {
        const cost = flexprice.gate("graphQuery", 1, used, wallet);
        const leads = body.leads ?? seedLeads.filter((l) => l.fromThisRun);
        const paths = await graph.findWarmIntros(leads);
        await flexprice.record("graphQuery", 1);
        return NextResponse.json({
          paths, query: graph.WARM_INTRO_QUERY, cost,
          graphShape: graph.shape(await graph.writeLeads(seedLeads)),
          events: [
            ev("agent:builder", "Ran one graph query: shared past employers between your team and today's leads.", cost),
            ...paths.map((p) => ev("agent:builder", `Found 1 warm path: ${p.teammate} → ${p.pastEmployer} → ${p.buyer} at ${p.company}.`)),
          ],
        });
      }
      case "drafts": {
        const leads = body.leads ?? seedLeads;
        const messages = await llm.draftOutreach(leads);
        const flagged = messages.filter((m) => !m.review.ok).length;
        const claims = messages.reduce((a, m) => a + m.signalsUsed.length, 0);
        const room = await Promise.all(roomScript(messages, body.leads ?? seedLeads).map((p) => band.post(p)));
        return NextResponse.json({
          messages, room,
          events: [
            ev("agent:builder", `Drafted ${messages.length} first touches, each from that lead's own signals.`),
            ev("agent:reviewer", `Checked ${claims + 1} claims against their sources: ${claims + 1 - flagged} match, ${flagged} need you.`),
            ev("agent:reviewer", "Asked you in the Band room about the Brightkeel draft."),
            ev("agent:security", "Checked what each draft shares: work details only, no links out."),
          ],
        });
      }
      default:
        return NextResponse.json({ error: "unknown step" }, { status: 404 });
    }
  } catch (e) {
    if (e instanceof flexprice.CreditError) return NextResponse.json({ error: e.message, rule: "credits" }, { status: 402 });
    if (e instanceof RuleError) return NextResponse.json({ error: e.message, rule: e.rule }, { status: 422 });
    throw e;
  }
}

/** Enrich leads in order until the wallet runs out. The rest are kept, marked paused, and not charged. */
async function enrichWithinCredits(found: Lead[], used: number, wallet: number) {
  const n = Math.min(found.length, flexprice.affordable("enrich", used, wallet));
  const done = (await hunter.enrich(found.slice(0, n))).map((l) => ({ ...l, enrichment: "done" as const }));
  if (n) await flexprice.record("enrich", n);
  // Paused leads keep whatever discovery found; the UI shows them as not enriched and no lookup runs for them.
  const waiting = found.slice(n).map((l) => ({ ...l, enrichment: "paused" as const }));
  return { leads: [...done, ...waiting], enriched: n, paused: waiting.length, cost: n * PRICES.enrich };
}

const pausedEvent = (paused: number) =>
  ev("agent:builder", `Enrichment stopped at 0 credits. ${paused} lead${paused === 1 ? " waits" : "s wait"} for a top-up; nothing was charged for ${paused === 1 ? "it" : "them"}.`);

/** The Band room conversation after drafting (sample script, built from this run's drafts). */
function roomScript(messages: Message[], leads: Lead[]): RoomPost[] {
  const name = (m: Message) => leads.find((l) => l.id === m.leadId)?.person.name.split(" ")[0] ?? "the buyer";
  const flagged = messages.find((m) => !m.review.ok && m.review.fix);
  const claims = messages.reduce((a, m) => a + m.signalsUsed.length, 0) + 1;
  const open = messages.filter((m) => !m.review.ok).length;
  const posts: RoomPost[] = [
    { id: "r1", who: "Builder", kind: "agent", mentions: ["Reviewer"],
      text: `Drafted ${messages.length} first touches: ${messages.map(name).join(", ")}. Each one uses only that lead's own signals. @Reviewer over to you.` },
    { id: "r2", who: "Reviewer", kind: "agent",
      text: `Checked ${claims} claims against their sources. ${claims - open} match. ${open} need a person.` },
  ];
  if (flagged) {
    posts.push({
      id: "r3", who: "Reviewer", kind: "agent", mentions: ["You"],
      text: `@You The ${leads.find((l) => l.id === flagged.leadId)?.company.name ?? ""} draft says Alex suggested this intro. Nothing shows Alex agreed. How do you want to handle it?`,
      quote: { text: "Alex suggested I reach out", note: "No source. The graph shows a shared past employer, not an intro." },
      decision: { messageId: flagged.id },
    });
  }
  posts.push({ id: "r4", who: "Security", kind: "agent",
    text: "Checked what each draft shares: work details only, no links out. Approved sends go to a teammate's inbox, never to the prospect." });
  return posts;
}
