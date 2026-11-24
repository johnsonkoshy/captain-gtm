"use client";
import { useRun, hhmm, earlierMoves } from "@/components/RunProvider";
import { Head } from "@/components/Shell";
import { STAGES, type Stage } from "@/lib/types";

const DOT: Record<Stage, string> = { Matched: "#f4a337", Contacted: "#10243c", Replied: "#22558f", "Meeting Booked": "#1f8a55", "Closed/Lost": "#9aa3b0" };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function PipelinePage() {
  const { s } = useRun();
  const live = s.leads;
  const open = live.filter((l) => l.stage !== "Closed/Lost");
  const reached = (i: number) => open.filter((l) => STAGES.indexOf(l.stage) >= i).length;
  const audit = [...s.moves.slice().reverse().map((m) => ({ ...m, at: hhmm(m.at) })), ...earlierMoves];
  const byAgent = live.filter((l) => l.movedBy === "agent").length;
  const byBoth = live.filter((l) => l.movedBy === "agent-rep").length;
  const byRep = live.filter((l) => l.movedBy === "rep").length;
  const approvedToday = s.messages.filter((m) => m.status === "approved" || m.status === "sent").length;
  const freshIds = new Set(s.messages.filter((m) => m.status === "approved" || m.status === "sent").map((m) => m.leadId));

  return (
    <section>
      <Head step={6} mod="Module 5" title="Pipeline" lede="Every move shows whether an agent or a rep made it. Today's run sits beside four sample leads from an earlier run." />
      <div className="stats">
        <div className="stat"><b>{live.length}</b><span>Leads in the pipeline</span></div>
        <div className="stat"><b>{pct(reached(1), open.length)}%</b><span>Matched → Contacted</span></div>
        <div className="stat"><b>{pct(reached(2), reached(1))}%</b><span>Contacted → Replied</span></div>
        <div className="stat"><b>{approvedToday}</b><span>Approved by you today</span></div>
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
                  <div className="chips">
                    {l.movedBy === "agent-rep" && <><span className="chip agent">Agent drafted</span><span className="chip person">Rep approved</span></>}
                    {l.movedBy === "agent" && <span className="chip agent">Matched by Builder</span>}
                    {l.movedBy === "rep" && <span className="chip person">Moved by rep</span>}
                  </div>
                </div>
              ))}
              {!cards.length && <span className="small muted" style={{ padding: "0 4px" }}>Nothing here yet</span>}
            </div>
          );
        })}
      </div>
      <div className="grid2">
        <div className="card stack tight">
          <div className="card-title"><b>Conversion by stage</b><span className="small muted">open leads that reached each stage</span></div>
          {STAGES.slice(0, 4).map((name, i) => {
            const n = reached(i);
            return (
              <div key={name} className="conf">
                <span>{name}</span>
                <span className="meter amber" aria-hidden><span style={{ width: `${pct(n, open.length)}%` }} /></span>
                <span className="mono">{n}/{open.length}</span>
              </div>
            );
          })}
          <div className="row between small muted" style={{ paddingTop: 6 }}>
            <span>Closed/Lost: {live.length - open.length}</span>
            <span className="row gap"><span className="chip agent">Agent {byAgent}</span><span className="chip agent">Agent + rep {byBoth}</span><span className="chip person">Rep {byRep}</span></span>
          </div>
        </div>
        <div className="card stack tight">
          <div className="card-title"><b>Audit log</b><span className="small muted">who moved what</span></div>
          <div className="audit">
            {audit.map((a, i) => <div key={i}><span className="time">{a.at}</span><span><b>{a.text}</b> · <span className="muted">{a.by}</span></span></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
