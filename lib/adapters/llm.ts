import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env, type AdapterMode } from "../env";
import { icp as seedIcp, messages as seedMessages } from "@/seed";
import type { ICP, Intake, Lead, Message } from "../types";

/** LLM (Claude): drafts the ICP and outreach. Seed mode returns the seed ICP and drafts. */
export const mode = (): AdapterMode => (env.anthropicKey ? "live" : "seed");

async function ask(system: string, user: string): Promise<string | null> {
  const client = new Anthropic({ apiKey: env.anthropicKey });
  const res = await client.messages.create({
    model: env.llmModel,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") return null;
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

function parseJson<T>(s: string | null): T | null {
  if (!s) return null;
  const m = s.match(/\{[\s\S]*\}/);
  try { return m ? (JSON.parse(m[0]) as T) : null; } catch { return null; }
}

export async function draftIcp(intake: Intake): Promise<ICP> {
  if (mode() === "seed") return seedIcp;
  // Live path (written, untested without a key). Falls back to seed on any parse failure.
  const out = await ask(
    "You are the Planner. Return only JSON matching this TypeScript type: " +
      "{industries:{label:string,confidence:number}[],sizeBands:{label,confidence}[],personas:{title,seniority,confidence}[],triggers:{label,confidence}[],confidence:Record<string,number>,expansions:{id,segment,why,status:'suggested'}[]}. Confidence is 0 to 1. Three items per list.",
    JSON.stringify(intake),
  ).catch(() => null);
  return parseJson<ICP>(out) ?? seedIcp;
}

export async function draftOutreach(leads: Lead[]): Promise<Message[]> {
  if (mode() === "seed") return seedMessages;
  // Live path keeps the seed drafts' shape; rewrite bodies from each lead's own signals.
  return Promise.all(seedMessages.map(async (m) => {
    const lead = leads.find((l) => l.id === m.leadId);
    if (!lead) return m;
    const body = await ask(
      "You are the Builder. Write a short first-touch message. Use only the signals given; make no claim without one. Sign off as [REP NAME], Captain.",
      JSON.stringify({ person: lead.person.name, company: lead.company.name, signals: m.signalsUsed }),
    ).catch(() => null);
    return body ? { ...m, body } : m;
  }));
}
