// Shared shapes (board 5). Kept framework-free so they can fold back into Captain.

export type Confidence = number; // 0–1

export interface ICPItem { label: string; confidence: Confidence }
export interface Persona { title: string; seniority: string; confidence: Confidence }
export type ExpansionStatus = "suggested" | "accepted" | "adjusted" | "dismissed";
export interface Expansion { id: string; segment: string; why: string; status: ExpansionStatus }

export interface ICP {
  industries: ICPItem[];
  sizeBands: ICPItem[];
  personas: Persona[];
  triggers: ICPItem[];
  /** Per-field confidence, 0–1, e.g. { industries: 0.74 } */
  confidence: Record<string, Confidence>;
  expansions: Expansion[];
}

export interface Source { url: string; label?: string }
export interface Signal { text: string; when: string; source: Source }

export type EmailStatus = "verified" | "unverified" | "unknown";
export type Tier = "A" | "B" | "C";
export const STAGES = ["Matched", "Contacted", "Replied", "Meeting Booked", "Closed/Lost"] as const;
export type Stage = (typeof STAGES)[number];
/** Who made the last move. "agent-rep" is derived: an agent drafted, a person approved. */
export type MovedBy = "agent" | "rep" | "agent-rep";

export interface Lead {
  id: string;
  company: { name: string; domain: string; size: string; sources: Source[] };
  person: { name: string; title: string; linkedin?: string; email: string; emailStatus: EmailStatus };
  signals: Signal[];
  fit: number; // 0–100
  tier: Tier;
  stage: Stage;
  movedBy: MovedBy;
  /** true when found in this run, false for earlier-run sample leads */
  fromThisRun: boolean;
  /** "paused" when the credit gate stopped enrichment before this lead (no email lookup, nothing charged). */
  enrichment?: "done" | "paused";
}

export type Channel = "email" | "linkedin";
export type MessageStatus = "draft" | "edited" | "approved" | "rejected" | "sent";

export interface ReviewNote { ok: boolean; text: string; fix?: string }

export interface Message {
  id: string;
  leadId: string;
  channel: Channel;
  step: number;
  subject: string;
  body: string;
  signalsUsed: { text: string; source: Source }[];
  status: MessageStatus;
  draftedBy: Actor;
  decidedBy?: Actor;
  decidedAt?: string;
  review: ReviewNote;
}

export type AgentName = "planner" | "builder" | "reviewer" | "security";
/** "agent:planner" | "person:You" */
export type Actor = `agent:${AgentName}` | `person:${string}`;

export interface Event {
  at: string; // ISO
  actor: Actor;
  action: string;
  leadId?: string;
  cost?: number; // credits spent
}

export interface Move { at: string; text: string; by: string }

export type NodeLabel = "Company" | "Person" | "Product" | "Competitor" | "Signal";
export type EdgeType =
  | "works_at" | "competes_with" | "matched_to" | "contacted_via" | "replied_to" | "previously_employed_at";
export interface GraphNode { id: string; label: NodeLabel; props: Record<string, string | number | boolean> }
export interface GraphEdge { from: string; to: string; type: EdgeType }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }
export interface WarmPath { teammate: string; pastEmployer: string; buyer: string; leadId: string; company: string }

export interface Intake { desc: string; features: string; customers: string; pricing: string }
export interface Competitor { name: string; diff: string }
export interface Dropped { company: string; why: string }

/** Credits charged per metered action (Flexprice). */
export const PRICES = { enrich: 2, graphQuery: 1, send: 1 } as const;
export const WALLET = 60;

/** A post in the agent room (Band). `mentions` holds the names it @mentions. */
export interface RoomPost {
  id: string;
  who: string;
  kind: "agent" | "person";
  text: string;
  at?: string;
  mentions?: string[];
  /** The exact line the post is about, with why it was flagged. */
  quote?: { text: string; note: string };
  /** The post asks a person to decide; the room shows a decision card under it. */
  decision?: { messageId: string };
}

export const isAgent = (a: Actor) => a.startsWith("agent:");
export const isPerson = (a: Actor) => a.startsWith("person:");
export const actorName = (a: Actor) => {
  const n = a.split(":")[1];
  return n.charAt(0).toUpperCase() + n.slice(1);
};
