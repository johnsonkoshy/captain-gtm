"use client";
import { usePathname } from "next/navigation";
import { ORDER, LABELS, useRun, hhmm, type Screen } from "./RunProvider";
import { CreditMeter } from "./CreditMeter";
import { isAgent, actorName } from "@/lib/types";

export function Shell({ children }: { children: React.ReactNode }) {
  const { s, go, reset, busy, thinking } = useRun();
  const path = usePathname();
  const here = (path.split("/")[1] || "intake") as Screen;
  const pending = s.ran.drafts ? s.messages.filter((m) => m.status === "draft" || m.status === "edited").length : 0;
  const done: Record<Screen, boolean> = { intake: s.ran.icp, icp: s.ran.discovery, discovery: s.ran.graph, intros: s.ran.drafts, review: s.ran.drafts && pending === 0, pipeline: false };
  const events = s.events.slice().reverse();

  return (
    <div className="app">
      <aside className="side" aria-label="Captain GTM navigation">
        <div className="brand">
          <svg role="img" aria-label="Captain sailboat mark" width="34" height="34" viewBox="0 0 48 48">
            <path d="M24 9 L24 31" stroke="#f6f3ec" strokeWidth="2" fill="none" />
            <path d="M22.5 12 L22.5 30 L11 30 Z" fill="#f6f3ec" />
            <path d="M25.5 14 L25.5 30 L36 30 Z" fill="#f4a337" />
            <path d="M24 9 L30 11 L24 13 Z" fill="#f4a337" />
            <path d="M10 33 L38 33 L34 37 L14 37 Z" fill="#f6f3ec" />
            <path d="M9 40 Q13 38 17 40 T25 40 T33 40 T39 40" stroke="#f4a337" strokeWidth="1.5" fill="none" />
          </svg>
          <div><b>Captain GTM</b><span>Demo run · product: Captain</span></div>
        </div>
        <div className="eyebrow">The run</div>
        <nav aria-label="Run steps">
          {ORDER.map((id, i) => {
            const on = id === here;
            const passed = done[id] && !on;
            return (
              <button key={id} type="button" className={`nav ${on ? "on" : ""} ${passed ? "passed" : ""}`} aria-current={on ? "page" : undefined} disabled={busy} onClick={() => go(id)}>
                <span className="num" aria-hidden>{passed ? "✓" : i + 1}</span><span>{LABELS[id]}</span>
                {id === "review" && pending > 0 && <span className="badge" aria-label={`${pending} waiting`}>{pending}</span>}
              </button>
            );
          })}
        </nav>
        <CreditMeter />
        <p className="small muted-light" style={{ margin: "0 4px" }}>Prototype on sample data. Every company and person here is made up.</p>
      </aside>

      <main className="main">
        <div className="crumbs">
          <span>Captain GTM › Demo run › <b style={{ color: "var(--navy)" }}>{LABELS[here] ?? ""}</b></span>
          <div className="row gap"><span className="proto">Prototype · sample data</span><button type="button" className="btn" onClick={reset} disabled={busy}>Start over</button></div>
        </div>
        {s.error && <div className="alert" role="alert">{s.error}</div>}
        {children}
      </main>

      <aside className="feed" aria-label="Agent Thinking feed">
        <div className="row between"><h2>Agent Thinking</h2><span className="live"><span aria-hidden className="dot" />Live</span></div>
        <p className="small muted" style={{ margin: 0 }}>Every search, graph hop and decision, with who made it. Agents are amber, people are navy.</p>
        <div className="legend">
          {["Planner", "Builder", "Reviewer", "Security"].map((n) => <span key={n} className="chip agent">{n}</span>)}
          <span className="chip person">You</span>
        </div>
        <div className="events" aria-live="polite">
          {thinking && (
            <div className="event thinking">
              <div className="row gap"><span className="chip agent">{actorName(thinking.actor)}</span><span className="typing" aria-hidden><i /><i /><i /></span></div>
              <span className="muted">{thinking.text}…</span>
            </div>
          )}
          {events.map((e, i) => (
            <div key={`${e.at}-${events.length - i}`} className={`event ${isAgent(e.actor) ? "agent" : "person"} ${i === 0 && !thinking ? "newest" : ""}`}>
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
      <button type="button" className="btn primary lg" disabled={busy} onClick={() => go(to)}>{busy ? "Working…" : <>{label} <span aria-hidden>→</span></>}</button>
      <span className="muted">{note}</span>
    </div>
  );
}

export function Head({ step, mod, title, lede, tags }: { step: number; mod: string; title: string; lede: string; tags?: React.ReactNode }) {
  return (
    <div className="head">
      <span className="eyebrow amber">Step {step} of 6 · {mod}</span>
      <div className="row gap wrap" style={{ justifyContent: "space-between" }}><h1>{title}</h1>{tags && <div className="row gap wrap">{tags}</div>}</div>
      <p className="lede">{lede}</p>
    </div>
  );
}
