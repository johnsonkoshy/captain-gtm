"use client";
import { useRun, hhmm } from "@/components/RunProvider";
import { Head, Next } from "@/components/Shell";
import { Empty } from "@/components/Empty";
import type { MessageStatus } from "@/lib/types";

const LOOK: Record<MessageStatus, [string, string]> = {
  draft: ["Draft", "mute"], edited: ["Edited", "info"], approved: ["Approved · dry run", "ok"], sent: ["Approved · sent", "ok"], rejected: ["Rejected", "mute"],
};
const FLAG = "suggested I reach out";

export default function ReviewPage() {
  const { s, update, approve, reject, log, busy } = useRun();
  if (!s.ran.drafts) return <Empty />;
  const open = s.messages.filter((m) => m.status === "draft" || m.status === "edited").length;
  const view = s.messages.map((m) => {
    const ui = s.msgUi[m.id];
    const fixed = !!m.review.fix && ui.edited && !m.body.includes(FLAG);
    return { m, ui, lead: s.leads.find((l) => l.id === m.leadId)!, ok: m.review.ok || fixed,
      reviewText: fixed ? "Resolved: the line about Alex is gone. The other claims match their sources." : m.review.text };
  });
  const sel = view.find((v) => v.m.id === s.sel) ?? view[0];
  const bandReply = view.some((v) => v.m.review.fix && v.ui.edited && !v.m.body.includes(FLAG));
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
      <Head step={5} mod="Module 4 · the approval gate" title="Review queue" lede="Nothing leaves without a person's yes. Approved messages go to a teammate's inbox, never to the prospect." />
      <div className="review">
        <div className="stack">
          <div className="card stack tight">
            <div><b>{open}</b> waiting for you · {s.messages.length} drafts</div>
            {view.map(({ m, lead, ok }) => (
              <button key={m.id} type="button" className={`qrow ${m.id === sel.m.id ? "on" : ""}`} aria-current={m.id === sel.m.id ? "true" : undefined}
                onClick={() => update((p) => ({ ...p, sel: m.id }))}>
                <span className="row between"><b>{lead.person.name}</b><span className={`status ${LOOK[m.status][1]}`}>{LOOK[m.status][0]}</span></span>
                <span className="small muted">{lead.company.name} · {m.channel === "email" ? "Email" : "LinkedIn"}</span>
                {!ok && <span className="small flag">Reviewer flagged a claim</span>}
              </button>
            ))}
          </div>
          <div className="card stack tight">
            <div className="row between"><b>Band room</b><code>#captain-gtm</code></div>
            {s.room.map((r, i) => <div key={i} className="post"><span className={`chip ${r.kind}`}>{r.who}</span><span>{r.text}</span></div>)}
            {bandReply && <div className="post"><span className="chip person">You</span><span>Edited. It now says only that we both worked at Meridian Care.</span></div>}
          </div>
        </div>

        <article className="card stack">
          <div className="row between">
            <div className="stack tight">
              <b>{sel.lead.person.name}, {sel.lead.person.title}</b>
              <span className="small muted">{sel.lead.company.name} · {sel.lead.person.email} · {sel.m.channel === "email" ? "Email" : "LinkedIn"}, step {sel.m.step}</span>
            </div>
            <span className={`status ${LOOK[sel.m.status][1]}`}>{LOOK[sel.m.status][0]}</span>
          </div>
          {sel.m.subject && <div><span className="muted">Subject</span> <b>{sel.m.subject}</b></div>}
          {!sel.ui.editing ? <div className="body">{sel.m.body}</div> : (
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
          <div className={`reviewnote ${sel.ok ? "ok" : "flag"}`}><span className="chip agent">Reviewer</span><span>{sel.reviewText}</span></div>
          {(sel.m.status === "draft" || sel.m.status === "edited") && !sel.ui.editing && (
            <div className="row gap">
              <button className="btn primary" disabled={busy} onClick={() => approve(sel.m.id)}>Approve and send to a teammate</button>
              <button className="btn" onClick={() => ui(sel.m.id, { editing: true, draft: sel.m.body })}>Edit</button>
              <button className="btn ghost" onClick={() => reject(sel.m.id)}>Reject</button>
            </div>
          )}
          {(sel.m.status === "sent" || sel.m.status === "approved") && (
            <div className="done ok">Approved by you at {hhmm(sel.m.decidedAt!)}. {sel.m.status === "sent" ? "Sent to a teammate's inbox" : "Held in the dry-run outbox"}, not to {sel.lead.person.name}.</div>
          )}
          {sel.m.status === "rejected" && <div className="done">Rejected by you at {hhmm(sel.m.decidedAt!)}. Nothing was sent.</div>}
        </article>
      </div>
      <Next to="pipeline" label="Open the pipeline" note="Approved leads move to Contacted, marked agent drafted, rep approved." />
    </section>
  );
}
