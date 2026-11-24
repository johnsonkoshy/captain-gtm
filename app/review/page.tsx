"use client";
import { useRun, hhmm } from "@/components/RunProvider";
import { Head, Next } from "@/components/Shell";
import { Empty } from "@/components/Empty";
import { BandRoom } from "@/components/BandRoom";
import { ServiceTag } from "@/components/ServiceTag";
import type { MessageStatus } from "@/lib/types";

const LOOK: Record<MessageStatus, [string, string]> = {
  draft: ["Draft", "mute"], edited: ["Edited", "info"], approved: ["Approved · dry run", "ok"], sent: ["Approved · sent", "ok"], rejected: ["Rejected", "mute"],
};
const FLAG = "suggested I reach out";
const FLAG_LINE = "Alex suggested I reach out";

/** Shows the draft, with the claim the Reviewer flagged marked in place. */
function Body({ text, flagged }: { text: string; flagged: boolean }) {
  if (!flagged || !text.includes(FLAG_LINE)) return <div className="body">{text}</div>;
  const [a, b] = text.split(FLAG_LINE);
  return <div className="body">{a}<mark title="Flagged by the Reviewer: no source">{FLAG_LINE}</mark>{b}</div>;
}

export default function ReviewPage() {
  const { s, update, approve, reject, log, busy } = useRun();
  if (!s.ran.drafts) return <Empty step="review" />;
  const open = s.messages.filter((m) => m.status === "draft" || m.status === "edited").length;
  const view = s.messages.map((m) => {
    const ui = s.msgUi[m.id];
    const fixed = !!m.review.fix && ui.edited && !m.body.includes(FLAG);
    const ok = m.review.ok || fixed;
    return { m, ui, lead: s.leads.find((l) => l.id === m.leadId)!, ok, blocked: !ok && (!!m.review.fix || !ui.edited),
      reviewText: fixed ? "Resolved: the line about Alex is gone. The other claims match their sources." : m.review.text };
  });
  const sel = view.find((v) => v.m.id === s.sel) ?? view[0];
  const ui = (id: string, patch: Partial<(typeof s.msgUi)[string]>) => update((p) => ({ ...p, msgUi: { ...p.msgUi, [id]: { ...p.msgUi[id], ...patch } } }));
  const save = (id: string) => update((p) => {
    const lead = p.leads.find((l) => l.id === p.messages.find((m) => m.id === id)!.leadId)!;
    const n = { ...p,
      messages: p.messages.map((m) => (m.id === id ? { ...m, body: p.msgUi[id].draft, status: "edited" as const } : m)),
      msgUi: { ...p.msgUi, [id]: { ...p.msgUi[id], editing: false, edited: true } } };
    return log(n, `Edited the draft to ${lead.person.name}.`);
  });

  return (
    <section>
      <Head step={5} mod="Module 4 · the approval gate" title="Review queue" lede="Nothing leaves without a person's yes. Approved messages go to a teammate's inbox, never to the prospect."
        tags={<><span className="chip agent">Reviewer</span><span className="chip person">You approve</span><ServiceTag svc="llm" name="Claude" /></>} />
      <div className="review">
        <div className="stack">
          <div className="card stack tight">
            <div className="card-title"><span><b>{open}</b> waiting for you</span><span className="muted small">{s.messages.length} drafts</span></div>
            {view.map(({ m, lead, ok }) => (
              <button key={m.id} type="button" className={`qrow ${m.id === sel.m.id ? "on" : ""} ${m.status === "draft" || m.status === "edited" ? "" : "closed"}`} aria-current={m.id === sel.m.id ? "true" : undefined}
                onClick={() => update((p) => ({ ...p, sel: m.id }))}>
                <span className="row between"><b>{lead.person.name}</b><span className={`status ${LOOK[m.status][1]}`}>{LOOK[m.status][0]}</span></span>
                <span className="small muted">{lead.company.name} · {m.channel === "email" ? "Email" : "LinkedIn"}</span>
                {!ok && (m.status === "draft" || m.status === "edited") && <span className="small flag">⚑ Reviewer flagged a claim</span>}
              </button>
            ))}
          </div>
          <BandRoom />
        </div>

        <article className="card stack">
          <div className="row between">
            <div className="stack tight">
              <b>{sel.lead.person.name}, {sel.lead.person.title}</b>
              <span className="small muted">{sel.lead.company.name} · {sel.lead.person.email} · {sel.m.channel === "email" ? "Email" : "LinkedIn"}, step {sel.m.step}</span>
            </div>
            <span className={`status ${LOOK[sel.m.status][1]}`}>{LOOK[sel.m.status][0]}</span>
          </div>
          {!sel.ui.editing ? (
            <div className="mail">
              <div className="hdr">
                <span>To</span><span>A teammate&apos;s inbox <span className="muted">(never {sel.lead.person.name})</span></span>
                {sel.m.subject && <><span>Subject</span><b>{sel.m.subject}</b></>}
              </div>
              <Body text={sel.m.body} flagged={!sel.ok} />
            </div>
          ) : (
            <>
              <label className="label">Edit the draft<textarea rows={10} value={sel.ui.draft} onChange={(e) => ui(sel.m.id, { draft: e.target.value })} /></label>
              <div className="row gap">
                <button className="btn primary" onClick={() => save(sel.m.id)}>Save edit</button>
                {sel.m.review.fix && <button className="btn" onClick={() => ui(sel.m.id, { draft: sel.m.review.fix! })}>Use the Reviewer&apos;s fix</button>}
                <button className="btn ghost" onClick={() => ui(sel.m.id, { editing: false })}>Cancel</button>
              </div>
            </>
          )}
          <div className="stack tight">
            <span className="eyebrow">Built on</span>
            {sel.m.signalsUsed.map((g) => (
              <span key={g.text} className="small">{g.text} · {g.source.url.startsWith("http") ? <a href={g.source.url} target="_blank" rel="noreferrer">{g.source.label}</a> : <code>{g.source.label}</code>}</span>
            ))}
          </div>
          <div className={`reviewnote ${sel.ok ? "ok" : "flag"}`}><span className="chip agent">Reviewer</span><span>{sel.ok ? "✓ " : "⚑ "}{sel.reviewText}</span></div>
          {(sel.m.status === "draft" || sel.m.status === "edited") && !sel.ui.editing && (
            <div className="row gap wrap">
              <button className="btn go lg" disabled={busy || sel.blocked} onClick={() => approve(sel.m.id)}>Approve and send to a teammate</button>
              <button className="btn" onClick={() => ui(sel.m.id, { editing: true, draft: sel.m.body })}>Edit</button>
              <button className="btn ghost" onClick={() => reject(sel.m.id)}>Reject</button>
              {sel.blocked && <span className="hint">Edit the flagged line, or reject this draft, before approving.</span>}
            </div>
          )}
          {(sel.m.status === "sent" || sel.m.status === "approved") && (
            <div className="decided ok"><span className="chip person">You</span>Approved by you at {hhmm(sel.m.decidedAt!)}. {sel.m.status === "sent" ? "Sent to a teammate's inbox" : "Held in the dry-run outbox"}, not to {sel.lead.person.name}.</div>
          )}
          {sel.m.status === "rejected" && <div className="decided"><span className="chip person">You</span>Rejected by you at {hhmm(sel.m.decidedAt!)}. Nothing was sent.</div>}
        </article>
      </div>
      <Next to="pipeline" label="Open the pipeline" note="Approved leads move to Contacted, marked agent drafted, rep approved." />
    </section>
  );
}
