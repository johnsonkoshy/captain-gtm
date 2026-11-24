"use client";
import { useRun, hhmm, earlierMoves } from "@/components/RunProvider";
import { Head } from "@/components/Shell";
import { STAGES } from "@/lib/types";

export default function PipelinePage() {
  const { s } = useRun();
  const live = s.leads;
  const open = live.filter((l) => l.stage !== "Closed/Lost");
  const audit = [...s.moves.slice().reverse().map((m) => ({ ...m, at: hhmm(m.at) })), ...earlierMoves];
  return (
    <section>
      <Head step={6} mod="Module 5" title="Pipeline" lede="Every move shows whether an agent or a rep made it. Today's run sits beside four sample leads from an earlier run." />
      <div className="board">
        {STAGES.map((st) => {
          const cards = live.filter((l) => l.stage === st);
          return (
            <div key={st} className="col">
              <div className="row between"><b>{st}</b><span className="pill">{cards.length}</span></div>
              {cards.map((l) => (
                <div key={l.id} className="kcard">
                  <div className="row between"><b>{l.company.name}</b><span className={`tier t${l.tier}`}>{l.tier}</span></div>
                  <span className="small muted">{l.person.name}, {l.person.title}</span>
                  {l.movedBy === "agent-rep" && <span className="row gap"><span className="chip agent">Agent drafted</span><span className="chip person">Rep approved</span></span>}
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
        <div className="card stack tight">
          <div className="row between"><b>Conversion by stage</b><span className="small muted">open leads that reached each stage</span></div>
          {STAGES.slice(0, 4).map((name, i) => {
            const n = open.filter((l) => STAGES.indexOf(l.stage) >= i).length;
            return (
              <div key={name} className="conf">
                <span>{name}</span>
                <span className="meter" aria-hidden><span style={{ width: `${open.length ? Math.round((n / open.length) * 100) : 0}%` }} /></span>
                <span className="mono">{n} of {open.length}</span>
              </div>
            );
          })}
          <span className="small muted">Closed/Lost: {live.length - open.length}</span>
        </div>
        <div className="card stack tight">
          <b>Audit log</b>
          {audit.map((a, i) => <div key={i} className="row gap"><span className="time">{a.at}</span><span><b>{a.text}</b> · <span className="muted">{a.by}</span></span></div>)}
        </div>
      </div>
    </section>
  );
}
