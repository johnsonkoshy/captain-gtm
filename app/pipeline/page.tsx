"use client";
import { useRun, hhmm, earlierMoves } from "@/components/RunProvider";
import { Head } from "@/components/Shell";
import { STAGES, type Lead, type Stage, type Tier } from "@/lib/types";

const DOT: Record<Stage, string> = { Matched: "#f4a337", Contacted: "#10243c", Replied: "#22558f", "Meeting Booked": "#1f8a55", "Closed/Lost": "#9aa3b0" };

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const FUNNEL = STAGES.slice(0, 4);

export default function PipelinePage() {
  const { s } = useRun();
  const live = s.leads;
  const open = live.filter((l) => l.stage !== "Closed/Lost");
  const lost = live.length - open.length;
  const reached = FUNNEL.map((_, i) => open.filter((l) => STAGES.indexOf(l.stage) >= i).length);
  const freshIds = new Set(s.messages.filter((m) => m.status === "approved" || m.status === "sent").map((m) => m.leadId));
  const audit = [...s.moves.slice().reverse().map((m) => ({ ...m, at: hhmm(m.at) })), ...earlierMoves];
  const by = (k: Lead["movedBy"]) => live.filter((l) => l.movedBy === k).length;
  const who = [
    { k: "agent" as const, label: "Agent moved", cls: "a" },
    { k: "agent-rep" as const, label: "Agent drafted, rep approved", cls: "ap" },
    { k: "rep" as const, label: "Rep moved", cls: "p" },
  ].map((w) => ({ ...w, n: by(w.k) }));
  const tiers = (["A", "B", "C"] as Tier[]).map((t) => {
    const ls = live.filter((l) => l.tier === t);
    const worked = ls.filter((l) => l.stage !== "Matched").length;
    return { t, n: ls.length, worked, avg: ls.length ? Math.round(ls.reduce((a, l) => a + l.fit, 0) / ls.length) : 0 };
  });

  return (
    <section>
      <Head step={6} mod="Module 5" title="Pipeline" lede="Every move shows whether an agent or a rep made it. Today's run sits beside four sample leads from an earlier run." />
      <div className="stats">
        <div className="stat"><span className="small muted">In pipeline</span><b>{live.length}</b><span className="small muted">{open.length} open · {lost} closed/lost</span></div>
        <div className="stat"><span className="small muted">Matched → Contacted</span><b>{pct(reached[1], reached[0])}%</b><span className="small muted">{reached[1]} of {reached[0]} open leads contacted</span></div>
        <div className="stat"><span className="small muted">Contacted → Replied</span><b>{pct(reached[2], reached[1])}%</b><span className="small muted">{reached[2]} of {reached[1]} replied</span></div>
        <div className="stat"><span className="small muted">Replied → Meeting</span><b>{pct(reached[3], reached[2])}%</b><span className="small muted">{reached[3]} of {reached[2]} booked a meeting</span></div>
      </div>
      <div className="board">
        {STAGES.map((st) => {
          const cards = live.filter((l) => l.stage === st);
          return (
            <div key={st} className="col">
              <div className="col-head"><b><i style={{ background: DOT[st] }} />{st}</b><span className="pill">{cards.length}</span></div>
              {cards.map((l) => (
                <div key={l.id} className={`kcard ${freshIds.has(l.id) ? "fresh" : ""}`}>
                  <div className="row between"><b>{l.company.name}</b><span className={`tier t${l.tier}`}>{l.tier}</span></div>
                  <span className="small muted">{l.person.name}, {l.person.title}</span>
                  <span className="row between"><span className="kfit">Fit {l.fit}</span><a className="small" href={l.signals[0]?.source.url} target="_blank" rel="noreferrer">source</a></span>
                  {l.movedBy === "agent-rep" && <span className="row gap wrap"><span className="chip agent">Agent drafted</span><span className="chip person">Rep approved</span></span>}
                  {l.movedBy === "agent" && <span><span className="chip agent">Matched by Builder</span></span>}
                  {l.movedBy === "rep" && <span><span className="chip person">Moved by rep</span></span>}
                </div>
              ))}
              {!cards.length && <span className="small muted">Nothing here yet</span>}
            </div>
          );
        })}
      </div>
      <div className="grid2">
        <div className="card stack">
          <div className="row between"><b>Conversion funnel</b><span className="small muted">open leads that reached each stage</span></div>
          <div className="funnel">
            {FUNNEL.map((name, i) => (
              <div key={name} className="stack tight">
                {i > 0 && <span className="rate">↓ {pct(reached[i], reached[i - 1])}% moved on</span>}
                <div className="fstep">
                  <span>{name}</span>
                  <span className="fbar"><span style={{ width: `${Math.max(pct(reached[i], reached[0]), 6)}%` }}>{reached[i]}</span></span>
                  <span className="mono">{pct(reached[i], reached[0])}%</span>
                </div>
              </div>
            ))}
          </div>
          <span className="small muted">Matched to meeting: {pct(reached[3], reached[0])}% · Closed/Lost: {lost}</span>
        </div>
        <div className="card stack">
          <b>Who made each move</b>
          <div className="split" aria-hidden>{who.map((w) => <span key={w.k} className={w.cls} style={{ width: `${pct(w.n, live.length)}%` }} />)}</div>
          <div className="stack tight">
            {who.map((w) => <div key={w.k} className="part"><span><span className={`key split-${w.cls}`} />{w.label}</span><span className="mono">{w.n}</span></div>)}
          </div>
          <span className="small muted">Agents never send. Every outreach needs a person&apos;s yes.</span>
          <b>By tier</b>
          <div className="stack tight">
            {tiers.map((t) => (
              <div key={t.t} className="part">
                <span className="row gap"><span className={`tier t${t.t}`}>{t.t}</span>{t.n} leads · average fit {t.avg}</span>
                <span className="mono">{pct(t.worked, t.n)}% worked</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card stack tight">
        <div className="card-title"><b>Audit log</b><span className="small muted">who moved what</span></div>
        <div className="audit">
          {audit.map((a, i) => <div key={i}><span className="time">{a.at}</span><span><b>{a.text}</b> · <span className="muted">{a.by}</span></span></div>)}
        </div>
      </div>
    </section>
  );
}
