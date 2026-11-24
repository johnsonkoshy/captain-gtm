"use client";
import { usePathname } from "next/navigation";
import { ORDER, LABELS, useRun, hhmm, type Screen } from "./RunProvider";
import { CreditMeter } from "./CreditMeter";
import { isAgent, actorName } from "@/lib/types";

export function Shell({ children }: { children: React.ReactNode }) {
  const { s, go, reset, busy } = useRun();
  const path = usePathname();
  const here = (path.split("/")[1] || "intake") as Screen;
  const pending = s.ran.drafts ? s.messages.filter((m) => m.status === "draft" || m.status === "edited").length : 0;
  const done: Record<Screen, boolean> = { intake: s.ran.icp, icp: s.ran.discovery, discovery: s.ran.graph, intros: s.ran.drafts, review: s.ran.drafts && pending === 0, pipeline: false };

  return (
    <div className="app">
      <aside className="side" aria-label="Captain GTM navigation">
        <div className="brand">
          <svg role="img" aria-label="Captain sailboat mark" width="32" height="32" viewBox="0 0 48 48">
            <path d="M24 9 L24 31" stroke="#f6f3ec" strokeWidth="2" fill="none" />
            <path d="M22.5 12 L22.5 30 L11 30 Z" fill="#f4a337" />
            <path d="M25.5 14 L25.5 30 L35 30 Z" fill="#f6f3ec" />
            <path d="M9 33 L39 33 L35 38 L13 38 Z" fill="#f6f3ec" />
          </svg>
          <div><b>Captain GTM</b><span>Demo run · product: Captain</span></div>
        </div>
        <div className="eyebrow">The run</div>
        <nav aria-label="Run steps">
          {ORDER.map((id, i) => {
            const on = id === here;
            return (
              <button key={id} type="button" className={`nav ${on ? "on" : ""} ${done[id] && !on ? "done" : ""}`} aria-current={on ? "page" : undefined} disabled={busy} onClick={() => go(id)}>
                <span className="num">{i + 1}</span><span>{LABELS[id]}</span>
                {id === "review" && pending > 0 && <span className="badge">{pending}</span>}
              </button>
            );
          })}
        </nav>
        <CreditMeter />
        <p className="small muted-light">Running on sample data. Every company and person here is made up.</p>
      </aside>

      <main className="main">
        <div className="crumbs">
          <span>Captain GTM › Demo run › <b>{LABELS[here] ?? ""}</b></span>
          <div className="row gap"><span className="pill">Sample data</span><button type="button" className="btn ghost" onClick={reset}>Start over</button></div>
        </div>
        {s.error && <div className="alert" role="alert">{s.error}</div>}
        {children}
      </main>

      <aside className="feed" aria-label="Agent Thinking feed">
        <div className="row between"><h2>Agent Thinking</h2><span className="live"><span aria-hidden className="dot" />Live</span></div>
        <p className="small muted">Every search, graph hop and decision, with who made it. Agents are amber, people are navy.</p>
        <div className="legend">
          {["Planner", "Builder", "Reviewer", "Security"].map((n) => <span key={n} className="chip agent">{n}</span>)}
          <span className="chip person">You</span>
        </div>
        <div className="events">
          {s.events.slice().reverse().map((e, i) => (
            <div key={i} className="event">
              <div className="row gap">
                <span className="time">{hhmm(e.at)}</span>
                <span className={`chip ${isAgent(e.actor) ? "agent" : "person"}`}>{actorName(e.actor)}</span>
                {e.cost ? <span className="cost">−{e.cost} credit{e.cost === 1 ? "" : "s"}</span> : null}
              </div>
              <span>{e.action}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function Next({ label, note, to }: { label: string; note: string; to: Screen }) {
  const { go, busy } = useRun();
  return (
    <div className="next">
      <button type="button" className="btn primary" disabled={busy} onClick={() => go(to)}>{busy ? "Working…" : label}</button>
      <span className="muted">{note}</span>
    </div>
  );
}

export function Head({ step, mod, title, lede }: { step: number; mod: string; title: string; lede: string }) {
  return (
    <div className="head">
      <span className="eyebrow amber">Step {step} of 6 · {mod}</span>
      <h1>{title}</h1>
      <p className="lede">{lede}</p>
    </div>
  );
}
