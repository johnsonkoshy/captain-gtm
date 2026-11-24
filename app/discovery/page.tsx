"use client";
import { Fragment, useState } from "react";
import { useRun } from "@/components/RunProvider";
import { Head, Next } from "@/components/Shell";
import { Empty } from "@/components/Empty";
import { ServiceTag } from "@/components/ServiceTag";
import type { Lead, Tier } from "@/lib/types";

const TIERS: { t: Tier; range: string; what: string }[] = [
  { t: "A", range: "80+", what: "write first" },
  { t: "B", range: "65–79", what: "write this week" },
  { t: "C", range: "under 65", what: "watch for a new signal" },
];

function FitBar({ fit }: { fit: number }) {
  return <span className="meter fitbar" aria-hidden><span style={{ width: `${fit}%` }} /></span>;
}

function Detail({ l }: { l: Lead }) {
  return (
    <div className="detail" role="row">
      <div className="stack tight">
        <b className="small">Why fit is {l.fit}</b>
        {(l.fitParts ?? []).map((p) => (
          <div key={p.label} className="part">
            <span>{p.label}</span>
            <span className={`mono ${p.points < 0 ? "neg" : ""}`}>{p.points > 0 ? "+" : ""}{p.points}</span>
          </div>
        ))}
        <div className="part total"><span>Fit score · tier {l.tier}</span><span className="mono">{l.fit}</span></div>
      </div>
      <div className="stack tight">
        <b className="small">Every signal, with its source</b>
        {l.signals.map((s) => (
          <div key={s.text} className="srcrow">
            <span>{s.text}</span>
            <span className="small muted"><a href={s.source.url} target="_blank" rel="noreferrer">{s.source.label ?? s.source.url}</a> · {s.when}</span>
          </div>
        ))}
        <span className="small muted">{l.enrichment === "paused" ? "Enrichment paused: the credit gate stopped before this lead, so no email lookup and nothing charged." : <>Work email: {l.person.email} · {l.person.emailStatus === "verified" ? "verified by Hunter" : "not verified, the Reviewer will hold sends"}</>}</span>
      </div>
    </div>
  );
}

export default function DiscoveryPage() {
  const { s } = useRun();
  const [open, setOpen] = useState<string | null>(null);
  if (!s.ran.discovery) return <Empty step="discovery" />;
  const today = s.leads.filter((l) => l.fromThisRun).sort((a, b) => b.fit - a.fit);
  const verified = today.filter((l) => l.enrichment !== "paused" && l.person.emailStatus === "verified").length;
  const byTier = (t: Tier) => today.filter((l) => l.tier === t).length;
  const avg = today.length ? Math.round(today.reduce((a, l) => a + l.fit, 0) / today.length) : 0;
  return (
    <section>
      <Head step={3} mod="Modules 2 and 3" title="Discovery and enrichment" lede="Accounts and buyers found on public pages, enriched with a verified work email, scored for fit and sorted into tiers. Every lead keeps its source."
        tags={<><span className="chip agent">Builder</span><ServiceTag svc="tavily" name="Tavily" /><ServiceTag svc="hunter" name="Hunter" /></>} />
      <div className="stats">
        <div className="stat"><span className="small muted">Accounts kept</span><b>{today.length}</b><span className="small muted">{s.dropped.length} dropped for negative signals</span></div>
        <div className="stat"><span className="small muted">Emails verified</span><b>{verified}<span className="of"> of {today.length}</span></b><span className="small muted">work addresses, checked by Hunter</span></div>
        <div className="stat"><span className="small muted">Average fit</span><b>{avg}</b><span className="small muted">0–100, against the ICP</span></div>
        <div className="stat">
          <span className="small muted">Tiers</span>
          <div className="row gap tiers">{TIERS.map(({ t }) => <span key={t} className="row gap"><span className={`tier t${t}`}>{t}</span><b>{byTier(t)}</b></span>)}</div>
          <span className="small muted">A 80+ · B 65–79 · C under 65</span>
        </div>
      </div>
      <div className="card table" role="table" aria-label="Leads found in this run">
        <div className="tr th" role="row"><span>Account</span><span>Buyer</span><span>Email</span><span>Top signal and source</span><span>Fit and tier</span></div>
        {today.map((l) => {
          const sg = l.signals[0];
          const isOpen = open === l.id;
          return (
            <Fragment key={l.id}>
              <button type="button" className={`tr trbtn ${isOpen ? "on" : ""}`} role="row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : l.id)}>
                <span className="stack tight"><b>{l.company.name}</b><span className="muted small">{l.company.domain} · {l.company.size}</span></span>
                <span className="stack tight"><span>{l.person.name}</span><span className="muted small">{l.person.title}</span></span>
                <span>{l.enrichment === "paused" ? <span className="status mute" title="The credit gate stopped enrichment before this lead">paused · no credits</span> : <span className={`status ${l.person.emailStatus === "verified" ? "ok" : "warn"}`}>{l.person.emailStatus}</span>}</span>
                <span className="stack tight">
                  <span>{sg.text}</span>
                  <span className="small muted"><a href={sg.source.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{sg.source.label ?? sg.source.url}</a> · {sg.when}{l.signals.length > 1 ? ` · +${l.signals.length - 1} more` : ""}</span>
                </span>
                <span className="stack tight">
                  <span className="row gap"><b className="fitnum">{l.fit}</b><span className={`tier t${l.tier}`}>{l.tier}</span><span className="chev" aria-hidden>{isOpen ? "▴" : "▾"}</span></span>
                  <FitBar fit={l.fit} />
                </span>
              </button>
              {isOpen && <Detail l={l} />}
            </Fragment>
          );
        })}
      </div>
      <span className="small muted">Select a lead to see how its fit score adds up and every source behind it.</span>
      <div className="grid2">
        <div className="card stack"><b>Dropped for negative signals</b>{s.dropped.map((d) => <div key={d.company} className="row gap"><span className="status mute">Dropped</span><span><b>{d.company}</b> · {d.why}</span></div>)}</div>
        <div className="card stack"><b>Competitor map</b>{s.competitors.map((c) => <div key={c.name}><b>{c.name}</b> · <span className="muted">{c.diff}</span></div>)}</div>
      </div>
      <Next to="intros" label="Find warm intros" note="Runs one query over the graph the Builder just wrote." />
    </section>
  );
}
