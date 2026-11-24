// Fictional seed data. Every company and person is made up; every domain ends in .example.
import type { Competitor, Dropped, ICP, Intake, Lead, Message, Move, Signal, Tier, EmailStatus, Stage, MovedBy, Graph, WarmPath } from "@/lib/types";

export const intake: Intake = {
  desc: "Captain is software for companies where people and AI agents work together. Each piece of work runs as a loop with its own shared agent. Agents research, build and draft; a person approves anything that leaves the company, and every decision is logged.",
  features: "Loops, a shared agent per loop, approvals, guardrails, history",
  customers: "Our own first company (design partner)",
  pricing: "[YOUR PRICE]",
};

const it = (label: string, confidence: number) => ({ label, confidence });
export const icp: ICP = {
  industries: [it("AI-native software startups", 0.86), it("Digital and dev agencies", 0.74), it("Healthtech with clinical review", 0.63)],
  sizeBands: [it("2–20 people", 0.81), it("21–100 people", 0.57)],
  personas: [
    { title: "Founder or CEO", seniority: "founder", confidence: 0.84 },
    { title: "Head of Engineering", seniority: "head", confidence: 0.78 },
    { title: "COO or operations lead", seniority: "VP", confidence: 0.55 },
  ],
  triggers: [it("Hiring a first AI or platform engineer", 0.79), it("Announced an agent pilot", 0.71), it("Raised a round in the last 6 months", 0.62)],
  confidence: { industries: 0.74, sizeBands: 0.69, personas: 0.72, triggers: 0.71 },
  expansions: [
    { id: "e1", segment: "Regulated teams that must sign off AI output", why: "Captain's approval step is the sign-off they already need.", status: "suggested" },
    { id: "e2", segment: "Agencies running client work with agents", why: "One loop per client, with the client as a reviewer.", status: "suggested" },
    { id: "e3", segment: "Solo founders running an agent crew", why: "Many of them, but the least able to pay.", status: "suggested" },
  ],
};

const sig = (text: string, when: string, path: string): Signal => ({ text, when, source: { url: `https://${path}`, label: path } });
const lead = (
  id: string, name: string, domain: string, size: string, person: string, title: string, emailStatus: EmailStatus,
  fit: number, tier: Tier, stage: Stage, movedBy: MovedBy, fromThisRun: boolean, signals: Signal[],
): Lead => ({
  id,
  company: { name, domain, size, sources: signals.map((s) => s.source) },
  person: { name: person, title, email: `${person.split(" ")[0].toLowerCase()}@${domain}`, emailStatus },
  signals, fit, tier, stage, movedBy, fromThisRun, fitParts: FIT[id],
});

/** Fit breakdowns: each lead's parts sum to its fit score. */
const fp = (...parts: [string, number][]) => parts.map(([label, points]) => ({ label, points }));
const FIT: Record<string, ReturnType<typeof fp>> = {
  tidewater: fp(["Trigger: hiring a first AI or platform engineer (0.79)", 32], ["2 sourced signals, both under a month old", 16], ["Buyer matches persona: Head of Engineering", 20], ["Work email verified", 20]),
  brightkeel: fp(["Segment: regulated team that signs off AI output", 30], ["2 sourced signals, one under 6 months", 13], ["Buyer matches persona: COO", 20], ["Work email verified", 20]),
  fernpoint: fp(["Trigger: runs operations with AI", 28], ["1 sourced signal", 8], ["Buyer matches persona: operations lead", 20], ["Work email verified", 20], ["Signal is 14 months old", -4]),
  saltmarsh: fp(["Trigger: announced an agent pilot (0.71)", 28], ["1 sourced signal, 5 weeks old", 8], ["Buyer matches persona: Head of Engineering", 20], ["Work email unverified", 8], ["Size in the 2–20 band", 6]),
  kestrel: fp(["Trigger: runs a small team with agents", 24], ["1 sourced signal", 8], ["Buyer matches persona: Founder", 20], ["Work email verified", 20], ["Solo-founder segment, least able to pay", -6]),
  pinecrest: fp(["Trigger: hiring an AI coordinator (partial match)", 18], ["1 sourced signal", 8], ["Buyer partly matches persona: Director of Operations", 12], ["Work email verified", 20], ["85 people, outside the core size band", -4]),
  harborlight: fp(["Trigger: hiring a first platform engineer (0.79)", 32], ["1 sourced signal", 8], ["Buyer matches persona: Founder and CEO", 20], ["Work email verified", 20]),
  larkspur: fp(["Segment: agency running client work with agents", 26], ["1 sourced signal", 8], ["Buyer matches persona: Founder", 20], ["Work email verified", 20]),
  quillstone: fp(["Segment: regulated team that signs off AI output", 26], ["1 sourced signal", 8], ["Buyer near persona: CTO", 15], ["Work email verified", 20]),
  corvid: fp(["Trigger: building agent tooling in-house", 24], ["1 sourced signal", 8], ["Buyer outside personas: Head of Product", 9], ["Work email verified", 20]),
};

export const leads: Lead[] = [
  lead("tidewater", "Tidewater Analytics", "tidewater.example", "38 people", "Maya Okafor", "Head of Engineering", "verified", 88, "A", "Matched", "agent", true,
    [sig("Hiring its first AI platform engineer", "12 days ago", "tidewater.example/careers"), sig("Engineering blog: piloting coding agents", "3 weeks ago", "tidewater.example/blog")]),
  lead("brightkeel", "Brightkeel Health", "brightkeel.example", "24 people", "Jonah Whitfield", "COO", "verified", 83, "A", "Matched", "agent", true,
    [sig("Clinicians sign off every AI-written note", "trust page", "brightkeel.example/trust"), sig("Seed round announced", "4 months ago", "brightkeel.example/news")]),
  lead("fernpoint", "Fernpoint Logistics", "fernpoint.example", "64 people", "Sara Lindqvist", "VP Operations", "verified", 72, "B", "Matched", "agent", true,
    [sig("Case study: dispatch run with AI", "14 months ago", "fernpoint.example/case-study")]),
  lead("saltmarsh", "Saltmarsh Bio", "saltmarsh.example", "17 people", "Owen Hart", "Head of Platform", "unverified", 70, "B", "Matched", "agent", true,
    [sig("Announced an agent pilot in the lab", "5 weeks ago", "saltmarsh.example/news")]),
  lead("kestrel", "Kestrel Works", "kestrel.example", "9 people", "Priya Nair", "Founder", "verified", 66, "B", "Matched", "agent", true,
    [sig("Founder talk on running a small team with agents", "2 months ago", "kestrel.example/talks")]),
  lead("pinecrest", "Pinecrest Clinics", "pinecrest.example", "85 people", "Elena Ruiz", "Director of Operations", "verified", 54, "C", "Matched", "agent", true,
    [sig("Hiring an AI program coordinator", "1 month ago", "pinecrest.example/jobs")]),
  lead("harborlight", "Harborlight Robotics", "harborlight.example", "30 people", "Tomás Reyes", "Founder and CEO", "verified", 80, "A", "Meeting Booked", "rep", false,
    [sig("Hiring a first platform engineer", "earlier run", "harborlight.example/jobs")]),
  lead("larkspur", "Larkspur Studio", "larkspur.example", "12 people", "Ines Duarte", "Founder", "verified", 74, "B", "Replied", "rep", false,
    [sig("Client builds with AI agents", "earlier run", "larkspur.example/services")]),
  lead("quillstone", "Quillstone Legal", "quillstone.example", "45 people", "Ravi Menon", "CTO", "verified", 69, "B", "Contacted", "agent-rep", false,
    [sig("Hiring an AI governance lead", "earlier run", "quillstone.example/jobs")]),
  lead("corvid", "Corvid Data", "corvid.example", "52 people", "Lena Park", "Head of Product", "verified", 61, "C", "Closed/Lost", "rep", false,
    [sig("Building agent tooling in-house", "earlier run", "corvid.example/blog")]),
];

export const dropped: Dropped[] = [
  { company: "Ashgrove Labs", why: "announced a hiring freeze" },
  { company: "Cobalt Yard", why: "acquired last month, so buying is on hold" },
];

export const competitors: Competitor[] = [
  { name: "General agent platforms", diff: "automate the work, but no named person approves what goes out" },
  { name: "Sales engagement tools", diff: "send at volume; research and review stay manual" },
  { name: "Doing it by hand", diff: "a founder's evenings, with nothing logged or shared" },
];

const src = (p: string) => ({ url: `https://${p}`, label: p });
export const messages: Message[] = [
  {
    id: "m1", leadId: "tidewater", channel: "email", step: 1, subject: "Your first AI platform engineer",
    body: "Hi Maya,\n\nI saw Tidewater is hiring its first AI platform engineer, and that your team is piloting coding agents.\n\nCaptain gives each piece of work a shared agent and a named person who approves what it ships, so agents move fast and nothing goes out unchecked.\n\nWorth 20 minutes next week?\n\n[REP NAME], Captain",
    signalsUsed: [{ text: "Hiring its first AI platform engineer", source: src("tidewater.example/careers") }, { text: "Piloting coding agents", source: src("tidewater.example/blog") }],
    status: "draft", draftedBy: "agent:builder",
    review: { ok: true, text: "2 of 2 claims match their sources." },
  },
  {
    id: "m2", leadId: "brightkeel", channel: "email", step: 1, subject: "Meridian Care, and sign-off on AI notes",
    body: "Hi Jonah,\n\nYou and my colleague Alex both worked at Meridian Care, and Alex suggested I reach out.\n\nYour trust page says clinicians sign off every AI-written note. Captain is built around that step: agents draft, a named person approves, and every decision is logged.\n\nOpen to a short call?\n\n[REP NAME], Captain",
    signalsUsed: [{ text: "Clinicians sign off every AI-written note", source: src("brightkeel.example/trust") }, { text: "Shared past employer: Meridian Care", source: { url: "graph://warm-intros", label: "graph query" } }],
    status: "draft", draftedBy: "agent:builder",
    review: {
      ok: false, text: "“Alex suggested I reach out” has no source. I asked you in the Band room.",
      fix: "Hi Jonah,\n\nYou and my colleague Alex both worked at Meridian Care.\n\nYour trust page says clinicians sign off every AI-written note. Captain is built around that step: agents draft, a named person approves, and every decision is logged.\n\nOpen to a short call?\n\n[REP NAME], Captain",
    },
  },
  {
    id: "m3", leadId: "fernpoint", channel: "linkedin", step: 1, subject: "",
    body: "Hi Sara, I read Fernpoint's case study on running dispatch with AI. Captain helps operations teams run agents with a person approving each change. Open to connecting?",
    signalsUsed: [{ text: "Case study: dispatch run with AI", source: src("fernpoint.example/case-study") }],
    status: "draft", draftedBy: "agent:builder",
    review: { ok: false, text: "Its only signal is 14 months old and may no longer be true." },
  },
];

export const earlierMoves: Move[] = [
  { at: "Earlier", text: "Harborlight Robotics → Meeting Booked", by: "rep" },
  { at: "Earlier", text: "Larkspur Studio → Replied", by: "rep" },
  { at: "Earlier", text: "Quillstone Legal → Contacted", by: "Builder drafted, rep approved" },
  { at: "Earlier", text: "Corvid Data → Closed/Lost", by: "rep" },
];

/** Teammates and their past employers, for the warm-intro query. */
export const team = [{ name: "Alex", pastEmployers: ["Meridian Care"] }];
export const buyerPastEmployers: Record<string, string[]> = { brightkeel: ["Meridian Care"] };

export const warmPaths: WarmPath[] = [
  { teammate: "Alex", pastEmployer: "Meridian Care", buyer: "Jonah Whitfield", leadId: "brightkeel", company: "Brightkeel Health" },
];

export function seedGraph(ls: Lead[]): Graph {
  const g: Graph = { nodes: [{ id: "product:captain", label: "Product", props: { name: "Captain" } }], edges: [] };
  for (const c of competitors) {
    g.nodes.push({ id: `competitor:${c.name}`, label: "Competitor", props: { name: c.name } });
    g.edges.push({ from: "product:captain", to: `competitor:${c.name}`, type: "competes_with" });
  }
  for (const t of team) {
    g.nodes.push({ id: `person:${t.name}`, label: "Person", props: { name: t.name, team: true } });
    for (const p of t.pastEmployers) {
      if (!g.nodes.find((n) => n.id === `company:${p}`)) g.nodes.push({ id: `company:${p}`, label: "Company", props: { name: p } });
      g.edges.push({ from: `person:${t.name}`, to: `company:${p}`, type: "previously_employed_at" });
    }
  }
  for (const l of ls) {
    const cid = `company:${l.company.domain}`, pid = `person:${l.person.email}`;
    g.nodes.push({ id: cid, label: "Company", props: { name: l.company.name, domain: l.company.domain } });
    g.nodes.push({ id: pid, label: "Person", props: { name: l.person.name, title: l.person.title } });
    g.edges.push({ from: pid, to: cid, type: "works_at" }, { from: cid, to: "product:captain", type: "matched_to" });
    for (const p of buyerPastEmployers[l.id] ?? []) g.edges.push({ from: pid, to: `company:${p}`, type: "previously_employed_at" });
    l.signals.forEach((s, i) => {
      g.nodes.push({ id: `signal:${l.id}:${i}`, label: "Signal", props: { text: s.text, source: s.source.url } });
    });
  }
  return g;
}
