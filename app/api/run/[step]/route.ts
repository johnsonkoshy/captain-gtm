import { NextResponse } from "next/server";
import * as llm from "@/lib/adapters/llm";
import * as tavily from "@/lib/adapters/tavily";
import * as hunter from "@/lib/adapters/hunter";
import * as graph from "@/lib/adapters/neo4j";
import * as flexprice from "@/lib/adapters/flexprice";
import * as band from "@/lib/adapters/band";
import { competitors, icp as seedIcp, leads as seedLeads } from "@/seed";
import { RuleError } from "@/lib/rules";
import type { Event, ICP, Intake, Lead } from "@/lib/types";

// Stateless: input in, adapter results plus Event records out. Run state lives in the client.
const ev = (actor: Event["actor"], action: string, cost?: number): Event => ({ at: new Date().toISOString(), actor, action, cost });
const count = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean).length;

export async function POST(req: Request, { params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const body = (await req.json().catch(() => ({}))) as { intake?: Intake; icp?: ICP; leads?: Lead[]; used?: number };
  const used = Number(body.used ?? 0);
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
        const cost = flexprice.gate("enrich", found.leads.length, used);
        const leads = await hunter.enrich(found.leads);
        await flexprice.record("enrich", leads.length);
        const g = await graph.writeLeads(leads);
        const ver = leads.filter((l) => l.person.emailStatus === "verified").length;
        const sigs = leads.reduce((a, l) => a + l.signals.length, 0);
        return NextResponse.json({
          leads, dropped: found.dropped, competitors, graphShape: graph.shape(g), cost,
          events: [
            ev("agent:builder", `Searched public pages for the ${icp.triggers.length} trigger events.`),
            ev("agent:builder", `Kept ${leads.length} accounts, each with a source link. Dropped ${found.dropped.length} for negative signals.`),
            ev("agent:builder", `Wrote ${leads.length} companies, ${leads.length} people and ${sigs} signals to the graph.`),
            ev("agent:builder", `Enriched ${leads.length} contacts with Hunter: ${ver} verified, ${leads.length - ver} unverified.`, cost),
          ],
        });
      }
      case "graph": {
        const cost = flexprice.gate("graphQuery", 1, used);
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
        const room = [
          await band.post({ who: "Reviewer", kind: "agent", text: "@You The Brightkeel draft says Alex suggested this intro. Nothing shows Alex agreed. Edit it, or check with Alex first?" }),
        ];
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
