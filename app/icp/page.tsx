"use client";
import { useRun } from "@/components/RunProvider";
import { Head, Next } from "@/components/Shell";
import { Empty } from "@/components/Empty";
import { ServiceTag } from "@/components/ServiceTag";

const LOOK = { accepted: ["Accepted", "ok"], adjusted: ["Adjusted", "info"], dismissed: ["Dismissed", "mute"] } as const;

export default function IcpPage() {
  const { s, update, log } = useRun();
  if (!s.icp) return <Empty step="icp" />;
  const groups = [
    { name: "Industries", key: "industries[]", items: s.icp.industries },
    { name: "Company size", key: "sizeBands[]", items: s.icp.sizeBands },
    { name: "Personas", key: "personas[]", items: s.icp.personas.map((p) => ({ label: `${p.title} · ${p.seniority}`, confidence: p.confidence })) },
    { name: "Trigger events", key: "triggers[]", items: s.icp.triggers },
  ];
  const decide = (id: string, status: "accepted" | "adjusted" | "dismissed") => update((p) => {
    const st = { ...p.exp[id], status, editing: false };
    const verb = { accepted: "Accepted", adjusted: "Adjusted", dismissed: "Dismissed" }[status];
    return log({ ...p, exp: { ...p.exp, [id]: st } }, `${verb} the segment “${st.text}”.`);
  });
  const patch = (id: string, v: Partial<(typeof s.exp)[string]>) => update((p) => ({ ...p, exp: { ...p.exp, [id]: { ...p.exp[id], ...v } } }));

  return (
    <section>
      <Head step={2} mod="Module 1" title="Ideal customer profile" lede="Drafted by the Planner from your intake. Each number is the Planner's confidence in that field, from 0.00 to 1.00."
        tags={<><span className="chip agent">Planner</span><ServiceTag svc="llm" name="Claude" /></>} />
      <div className="grid2">
        {groups.map((g) => (
          <div key={g.name} className="card">
            <div className="card-title" style={{ marginBottom: 6 }}><b>{g.name}</b><code className="muted small">{g.key}</code></div>
            {g.items.map((it) => (
              <div key={it.label} className={`conf ${it.confidence >= 0.75 ? "hi" : it.confidence < 0.6 ? "lo" : ""}`}>
                <span>{it.label}</span>
                <span className="meter" aria-hidden><span style={{ width: `${Math.round(it.confidence * 100)}%` }} /></span>
                <span className="mono">{it.confidence.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="card stack">
        <div className="card-title"><b>Expansion segments the Planner suggests</b><span className="muted small">Accept, adjust or dismiss each one</span></div>
        {s.icp.expansions.map((e) => {
          const st = s.exp[e.id];
          return (
            <div key={e.id} className="exp">
              <div className="stack tight">
                {st.editing ? <label className="label">Segment<input value={st.text} onChange={(ev) => patch(e.id, { text: ev.target.value })} /></label> : <b>{st.text}</b>}
                <span className="muted">{e.why}</span>
              </div>
              {st.status === "suggested" && !st.editing && (
                <div className="row gap">
                  <button className="btn primary" onClick={() => decide(e.id, "accepted")}>Accept</button>
                  <button className="btn" onClick={() => patch(e.id, { editing: true })}>Adjust</button>
                  <button className="btn ghost" onClick={() => decide(e.id, "dismissed")}>Dismiss</button>
                </div>
              )}
              {st.editing && <button className="btn primary" onClick={() => decide(e.id, "adjusted")}>Save segment</button>}
              {st.status !== "suggested" && <span className={`status ${LOOK[st.status][1]}`}>{LOOK[st.status][0]}</span>}
            </div>
          );
        })}
      </div>
      <Next to="discovery" label="Find accounts" note="The Builder searches public pages for these triggers." />
    </section>
  );
}
