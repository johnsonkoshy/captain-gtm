"use client";
import { useRun } from "@/components/RunProvider";
import { Head, Next } from "@/components/Shell";
import { Empty } from "@/components/Empty";
import { ServiceTag } from "@/components/ServiceTag";

export default function DiscoveryPage() {
  const { s } = useRun();
  if (!s.ran.discovery) return <Empty step="discovery" />;
  const today = s.leads.filter((l) => l.fromThisRun);
  const verified = today.filter((l) => l.enrichment !== "paused" && l.person.emailStatus === "verified").length;
  return (
    <section>
      <Head step={3} mod="Module 2" title="Discovery" lede="Accounts and buyers found on public pages, enriched with a work email. Every lead keeps its source."
        tags={<><span className="chip agent">Builder</span><ServiceTag svc="tavily" name="Tavily" /><ServiceTag svc="hunter" name="Hunter" /></>} />
      <div className="row gap">
        <span className="pill strong">{today.length} accounts kept</span>
        <span className="pill">{verified} emails verified</span>
        <span className="pill">{s.dropped.length} dropped for negative signals</span>
      </div>
      <div className="card table" role="table">
        <div className="tr th" role="row"><span>Account</span><span>Buyer</span><span>Email</span><span>Signal and source</span><span>Fit</span></div>
        {today.map((l) => {
          const sg = l.signals[0];
          return (
            <div key={l.id} className="tr" role="row">
              <div className="stack tight"><b>{l.company.name}</b><span className="muted small">{l.company.domain} · {l.company.size}</span></div>
              <div className="stack tight"><span>{l.person.name}</span><span className="muted small">{l.person.title}</span></div>
              <div>{l.enrichment === "paused" ? <span className="status mute" title="The credit gate stopped enrichment before this lead">paused · no credits</span> : <span className={`status ${l.person.emailStatus === "verified" ? "ok" : "warn"}`}>{l.person.emailStatus}</span>}</div>
              <div className="stack tight">
                <span>{sg.text}</span>
                <span className="small muted"><a href={sg.source.url} target="_blank" rel="noreferrer">{sg.source.label ?? sg.source.url}</a> · {sg.when}{l.signals.length > 1 ? ` · +${l.signals.length - 1} more` : ""}</span>
              </div>
              <div className="fit"><div className="row"><b>{l.fit}</b><span className={`tier t${l.tier}`}>{l.tier}</span></div><span className="meter amber" aria-hidden><span style={{ width: `${l.fit}%` }} /></span></div>
            </div>
          );
        })}
      </div>
      <div className="grid2">
        <div className="card stack"><b>Dropped for negative signals</b>{s.dropped.map((d) => <div key={d.company} className="row gap"><span className="status mute">Dropped</span><span><b>{d.company}</b> · {d.why}</span></div>)}</div>
        <div className="card stack"><b>Competitor map</b>{s.competitors.map((c) => <div key={c.name}><b>{c.name}</b> · <span className="muted">{c.diff}</span></div>)}</div>
      </div>
      <Next to="intros" label="Find warm intros" note="Runs one query over the graph the Builder just wrote." />
    </section>
  );
}
