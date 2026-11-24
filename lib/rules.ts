import "server-only";
import { env } from "./env";
import { isPerson, type Actor, type Lead, type Message, type MovedBy, type Stage } from "./types";

/**
 * The four rules, enforced in one place. Route handlers call these; nothing else
 * reaches the mailer or moves a stage.
 */
export class RuleError extends Error {
  constructor(public rule: string, msg: string) { super(msg); }
}

/** Rule 1: nothing is sent without a person's approval. */
export function requirePersonApproval(decidedBy: unknown): asserts decidedBy is Actor {
  if (typeof decidedBy !== "string" || !decidedBy.startsWith("person:") || decidedBy.length <= "person:".length) {
    throw new RuleError("approval", "A send needs a person's approval (decidedBy must be person:<name>). Agents cannot approve.");
  }
}

/**
 * Rule 2: approved sends go only to teammates on the allowlist, never to prospects.
 * The recipient is chosen here, on the server. It is never read from the request or from lead.email.
 * Returns null when the allowlist is empty: the send becomes a dry run.
 */
export function pickTeammateRecipient(lead: Pick<Lead, "person">): string | null {
  const list = env.sendAllowlist;
  if (!list.length) return null;
  const r = list[0];
  if (r === lead.person.email.toLowerCase()) throw new RuleError("allowlist", "Allowlist contains a prospect address.");
  return r;
}
export function assertAllowlisted(to: string) {
  if (!env.sendAllowlist.includes(to.toLowerCase())) throw new RuleError("allowlist", `${to} is not on SEND_ALLOWLIST.`);
}

/** Rule 3: every lead keeps its source link. */
export function requireSources<T extends Lead>(leads: T[]): T[] {
  for (const l of leads) {
    if (!l.company.sources.length || l.signals.some((s) => !s.source?.url)) {
      throw new RuleError("sources", `Lead ${l.company.name} has no source link.`);
    }
  }
  return leads;
}

/** Rule 4: every move records whether an agent or a person made it. */
export function moveStage(lead: Lead, to: Stage, actor: Actor, message?: Pick<Message, "draftedBy">): Lead {
  if (!actor) throw new RuleError("attribution", "A stage move needs an actor.");
  let movedBy: MovedBy = isPerson(actor) ? "rep" : "agent";
  if (isPerson(actor) && message && message.draftedBy.startsWith("agent:")) movedBy = "agent-rep";
  return { ...lead, stage: to, movedBy };
}
