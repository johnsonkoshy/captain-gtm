"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { intake as seedIntake, leads as allSeedLeads, earlierMoves } from "@/seed";
import { PRICES, WALLET, type Competitor, type RoomPost, type Dropped, type Event, type ICP, type Intake, type Lead, type Message, type Move, type NodeLabel, type WarmPath } from "@/lib/types";

export const ORDER = ["intake", "icp", "discovery", "intros", "review", "pipeline"] as const;
export type Screen = (typeof ORDER)[number];
export const LABELS: Record<Screen, string> = { intake: "Intake", icp: "ICP", discovery: "Discovery", intros: "Warm intros", review: "Review queue", pipeline: "Pipeline" };

export type { RoomPost };
export type RoomChoice = "fix" | "edit" | "reject";
interface ExpState { status: "suggested" | "accepted" | "adjusted" | "dismissed"; text: string; editing: boolean }
interface MsgUi { editing: boolean; draft: string; edited: boolean }

export interface RunState {
  intake: Intake;
  ran: { icp: boolean; discovery: boolean; graph: boolean; drafts: boolean };
  icp: ICP | null;
  exp: Record<string, ExpState>;
  leads: Lead[];
  dropped: Dropped[];
  competitors: Competitor[];
  graphShape: Partial<Record<NodeLabel, number>>;
  paths: WarmPath[];
  query: string;
  messages: Message[];
  msgUi: Record<string, MsgUi>;
  sel: string;
  room: RoomPost[];
  events: Event[];
  moves: Move[];
  usage: { enriched: number; graphQueries: number; sent: number };
  /** Credits in the wallet (sample data; top-ups add to it). */
  wallet: number;
  /** Credits added by top-ups this run, shown in the meter. */
  toppedUp: number;
  /** The person's answer to the Reviewer's question in the Band room. */
  roomDecision: { choice: RoomChoice; at: string } | null;
  error: string;
}

const earlierLeads = allSeedLeads.filter((l) => !l.fromThisRun);
const fresh = (): RunState => ({
  intake: { ...seedIntake },
  ran: { icp: false, discovery: false, graph: false, drafts: false },
  icp: null, exp: {}, leads: earlierLeads, dropped: [], competitors: [], graphShape: {}, paths: [], query: "",
  messages: [], msgUi: {}, sel: "m1", room: [],
  events: [{ at: new Date().toISOString(), actor: "agent:planner", action: "Waiting for the intake." }],
  moves: [], usage: { enriched: 0, graphQueries: 0, sent: 0 }, wallet: WALLET, toppedUp: 0, roomDecision: null, error: "",
});

export const creditsUsed = (u: RunState["usage"]) => u.enriched * PRICES.enrich + u.graphQueries * PRICES.graphQuery + u.sent * PRICES.send;
const KEY = "captain-gtm-run";
const hhmm = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? iso : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
export { hhmm };

// Seed mode answers instantly. A short beat lets the Agent Thinking feed show who is working (pacing only).
const beat = (ms = 650) => new Promise((r) => setTimeout(r, ms));

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
  return j as T;
}

export interface Thinking { actor: Event["actor"]; text: string }

interface Ctx {
  s: RunState;
  busy: boolean;
  thinking: Thinking | null;
  update: (f: (s: RunState) => RunState) => void;
  go: (target: Screen) => Promise<void>;
  reset: () => void;
  approve: (id: string) => Promise<void>;
  reject: (id: string) => void;
  log: (s: RunState, action: string) => RunState;
  topUp: (credits: number) => void;
  setWallet: (credits: number) => void;
  resumeEnrichment: () => Promise<void>;
  decideInRoom: (choice: RoomChoice) => void;
}
const RunCtx = createContext<Ctx | null>(null);
export const useRun = () => { const c = useContext(RunCtx); if (!c) throw new Error("no RunProvider"); return c; };

export function RunProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<RunState>(fresh);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState<Thinking | null>(null);
  const ref = useRef(s);
  ref.current = s;
  const router = useRouter();

  useEffect(() => { try { const raw = sessionStorage.getItem(KEY); if (raw) setS({ ...fresh(), ...JSON.parse(raw) }); } catch {} }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, [s]);

  const update = useCallback((f: (s: RunState) => RunState) => setS((p) => { const n = f(p); ref.current = n; return n; }), []);
  const log = (st: RunState, action: string): RunState => ({ ...st, events: [...st.events, { at: new Date().toISOString(), actor: "person:You", action }] });

  const go = useCallback(async (target: Screen) => {
    const ti = ORDER.indexOf(target);
    setBusy(true);
    try {
      let st = { ...ref.current, error: "" };
      const used = () => creditsUsed(st.usage);
      if (ti >= 1 && !st.ran.icp) {
        setThinking({ actor: "agent:planner", text: "Reading the intake and drafting the ICP" }); await beat();
        const r = await post<{ icp: ICP; events: Event[] }>("/api/run/icp", { intake: st.intake });
        const exp: Record<string, ExpState> = {};
        r.icp.expansions.forEach((e) => (exp[e.id] = { status: e.status, text: e.segment, editing: false }));
        st = { ...st, icp: r.icp, exp, events: [...st.events, ...r.events], ran: { ...st.ran, icp: true } };
      }
      if (ti >= 2 && !st.ran.discovery) {
        setThinking({ actor: "agent:builder", text: "Searching public pages and enriching contacts" }); await beat(900);
        const r = await post<{ leads: Lead[]; dropped: Dropped[]; competitors: Competitor[]; graphShape: RunState["graphShape"]; events: Event[]; enriched: number }>("/api/run/discovery", { icp: st.icp, used: used(), wallet: st.wallet });
        st = {
          ...st, leads: [...r.leads, ...earlierLeads], dropped: r.dropped, competitors: r.competitors, graphShape: r.graphShape,
          events: [...st.events, ...r.events], usage: { ...st.usage, enriched: st.usage.enriched + r.enriched }, ran: { ...st.ran, discovery: true },
          moves: [...st.moves, { at: new Date().toISOString(), text: `${r.leads.length} new leads → Matched`, by: "Builder agent" }],
        };
      }
      if (ti >= 3 && !st.ran.graph) {
        setThinking({ actor: "agent:builder", text: "Querying the graph for shared past employers" }); await beat();
        const r = await post<{ paths: WarmPath[]; query: string; graphShape: RunState["graphShape"]; events: Event[] }>("/api/run/graph", { leads: st.leads.filter((l) => l.fromThisRun), used: used(), wallet: st.wallet });
        st = { ...st, paths: r.paths, query: r.query, graphShape: r.graphShape, events: [...st.events, ...r.events], usage: { ...st.usage, graphQueries: st.usage.graphQueries + 1 }, ran: { ...st.ran, graph: true } };
      }
      if (ti >= 4 && !st.ran.drafts) {
        setThinking({ actor: "agent:builder", text: "Drafting first touches; the Reviewer checks each claim" }); await beat(900);
        const r = await post<{ messages: Message[]; room: RoomPost[]; events: Event[] }>("/api/run/drafts", { leads: st.leads });
        const msgUi: Record<string, MsgUi> = {};
        r.messages.forEach((m) => (msgUi[m.id] = { editing: false, draft: "", edited: false }));
        st = { ...st, messages: r.messages, msgUi, room: r.room, sel: r.messages[0]?.id ?? "", events: [...st.events, ...r.events], ran: { ...st.ran, drafts: true } };
      }
      update(() => st);
      router.push(`/${target}`);
    } catch (e) {
      update((p) => ({ ...p, error: (e as Error).message }));
    } finally { setBusy(false); setThinking(null); }
  }, [router, update]);

  const nextOpen = (st: RunState, after: string) => st.messages.find((m) => m.id !== after && (m.status === "draft" || m.status === "edited"))?.id ?? after;

  const approve = useCallback(async (id: string) => {
    const st = ref.current;
    const m = st.messages.find((x) => x.id === id)!;
    setBusy(true);
    try {
      const r = await post<{ status: Message["status"]; decidedAt: string; lead: { id: string; stage: Lead["stage"]; movedBy: Lead["movedBy"] }; events: Event[] }>(
        "/api/send", { messageId: id, subject: m.subject, body: m.body, decidedBy: "person:You", used: creditsUsed(st.usage), wallet: st.wallet });
      update((p) => {
        const lead = p.leads.find((l) => l.id === r.lead.id)!;
        const n: RunState = {
          ...p, error: "",
          messages: p.messages.map((x) => (x.id === id ? { ...x, status: r.status, decidedBy: "person:You", decidedAt: r.decidedAt } : x)),
          leads: p.leads.map((l) => (l.id === r.lead.id ? { ...l, stage: r.lead.stage, movedBy: r.lead.movedBy } : l)),
          events: [...p.events, ...r.events], usage: { ...p.usage, sent: p.usage.sent + 1 },
          moves: [...p.moves, { at: r.decidedAt, text: `${lead.company.name} → Contacted`, by: "Builder drafted, you approved" }],
        };
        return { ...n, sel: nextOpen(n, id) };
      });
    } catch (e) { update((p) => ({ ...p, error: (e as Error).message })); } finally { setBusy(false); }
  }, [update]);

  const reject = useCallback((id: string) => update((p) => {
    const m = p.messages.find((x) => x.id === id)!;
    const lead = p.leads.find((l) => l.id === m.leadId)!;
    const at = new Date().toISOString();
    let n: RunState = { ...p, messages: p.messages.map((x) => (x.id === id ? { ...x, status: "rejected", decidedBy: "person:You", decidedAt: at } : x)) };
    n = log(n, `Rejected the ${m.channel === "email" ? "email" : "LinkedIn note"} to ${lead.person.name}. Nothing was sent.`);
    n.moves = [...n.moves, { at, text: `Draft to ${lead.person.name} rejected`, by: "you" }];
    return { ...n, sel: nextOpen(n, id) };
  }), [update]);

  const topUp = useCallback((credits: number) => update((p) => log({ ...p, wallet: p.wallet + credits, toppedUp: p.toppedUp + credits, error: "" },
    `Topped up the wallet with ${credits} credits.`)), [update]);

  /** Demo control: start the run with a different wallet size (e.g. a small one, to show the gate stop enrichment). */
  const setWallet = useCallback((credits: number) => update((p) => ({ ...p, wallet: credits })), [update]);

  const resumeEnrichment = useCallback(async () => {
    const st = ref.current;
    setBusy(true);
    try {
      const r = await post<{ leads: Lead[]; enriched: number; events: Event[] }>("/api/run/enrich",
        { leads: st.leads.filter((l) => l.enrichment === "paused"), used: creditsUsed(st.usage), wallet: st.wallet });
      update((p) => ({
        ...p, error: "",
        leads: p.leads.map((l) => r.leads.find((x) => x.id === l.id) ?? l),
        usage: { ...p.usage, enriched: p.usage.enriched + r.enriched },
        events: [...p.events, ...r.events],
      }));
    } catch (e) { update((p) => ({ ...p, error: (e as Error).message })); } finally { setBusy(false); }
  }, [update]);

  const decideInRoom = useCallback((choice: RoomChoice) => {
    const st = ref.current;
    const post = st.room.find((r) => r.decision);
    const m = post && st.messages.find((x) => x.id === post.decision!.messageId);
    if (!m || st.roomDecision) return;
    const at = new Date().toISOString();
    if (choice === "reject") {
      update((p) => ({ ...p, roomDecision: { choice, at }, sel: m.id }));
      reject(m.id);
      return;
    }
    update((p) => {
      let n: RunState = { ...p, roomDecision: { choice, at }, sel: m.id };
      if (choice === "fix" && m.review.fix) {
        n = { ...n,
          messages: n.messages.map((x) => (x.id === m.id ? { ...x, body: m.review.fix!, status: "edited" as const } : x)),
          msgUi: { ...n.msgUi, [m.id]: { ...n.msgUi[m.id], editing: false, edited: true } } };
        return log(n, "Took the Reviewer's fix in the Band room: the line about Alex is gone.");
      }
      n = { ...n, msgUi: { ...n.msgUi, [m.id]: { ...n.msgUi[m.id], editing: true, draft: m.body } } };
      return log(n, "Said in the Band room that you'll edit the draft yourself.");
    });
  }, [update, reject]);

  const reset = useCallback(() => { setS(fresh()); router.push("/intake"); }, [router]);

  return <RunCtx.Provider value={{ s, busy, thinking, update, go, reset, approve, reject, log, topUp, setWallet, resumeEnrichment, decideInRoom }}>{children}</RunCtx.Provider>;
}

export { earlierMoves };
