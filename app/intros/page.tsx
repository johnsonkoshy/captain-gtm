"use client";
import { useRun } from "@/components/RunProvider";
import { Head, Next } from "@/components/Shell";
import { Empty } from "@/components/Empty";

const Arrow = ({ up }: { up?: boolean }) => (
  <svg aria-hidden width="10" height="40" viewBox="0 0 10 40">
    {up ? <><path d="M5 9 L5 40" stroke="#10243c" strokeWidth="2" /><path d="M0 10 L5 0 L10 10 Z" fill="#10243c" /></>
        : <><path d="M5 0 L5 31" stroke="#10243c" strokeWidth="2" /><path d="M0 30 L5 40 L10 30 Z" fill="#10243c" /></>}
  </svg>
);
const Node = ({ kind, name, sub }: { kind: string; name: string; sub: string }) => (
  <div className="node"><span className="eyebrow">{kind}</span><div className="stack tight"><b>{name}</b><span className="muted small">{sub}</span></div></div>
);

export default function IntrosPage() {
  const { s } = useRun();
  if (!s.ran.graph) return <Empty />;
  const p = s.paths[0];
  const lead = p && s.leads.find((l) => l.id === p.leadId);
  return (
    <section>
      <Head step={4} mod="Module 3" title="Warm intros" lede="One multi-hop query finds someone on your team who shares a past employer with a buyer." />
      <div className="grid2">
        <div className="card stack">
          {p && lead ? (
            <>
              <b>The path to {p.company}</b>
              <Node kind="Person" name={p.teammate} sub="On your team" />
              <div className="edge"><Arrow /><code>previously_employed_at</code></div>
              <Node kind="Company" name={p.pastEmployer} sub="Shared past employer" />
              <div className="edge"><Arrow up /><code>previously_employed_at</code></div>
              <Node kind="Person" name={p.buyer} sub={`${lead.person.title} · fit ${lead.fit}, tier ${lead.tier}`} />
              <div className="edge"><Arrow /><code>works_at</code></div>
              <Node kind="Company" name={p.company} sub={`${lead.company.domain} · today's lead`} />
            </>
          ) : <span className="muted">No warm paths found.</span>}
        </div>
        <div className="stack">
          <div className="card dark stack tight"><span className="eyebrow amber">The query · Neo4j AuraDB</span><pre>{s.query}</pre></div>
          <div className="card stack tight"><b>How the drafts use it</b><span>The Brightkeel draft can open with the shared employer. Saying Alex vouched needs Alex&apos;s yes first, so the Reviewer will check.</span></div>
          <div className="card stack tight"><b>The graph so far</b>
            <div className="row gap wrap">{Object.entries(s.graphShape).map(([k, n]) => <span key={k} className="pill"><b>{n}</b> {k}</span>)}</div>
          </div>
        </div>
      </div>
      <Next to="review" label="Draft outreach" note="The Builder drafts; the Reviewer checks every claim before you see it." />
    </section>
  );
}
