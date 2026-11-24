"use client";
import { Fragment, useEffect, useRef } from "react";
import { useRun, hhmm, type RoomChoice, type RoomPost } from "./RunProvider";

const FLAG = "suggested I reach out";
const CREW = [
  { name: "Planner", kind: "agent" }, { name: "Builder", kind: "agent" }, { name: "Reviewer", kind: "agent" },
  { name: "Security", kind: "agent" }, { name: "You", kind: "person" },
] as const;
const CHOICES: { id: RoomChoice; label: string; says: string }[] = [
  { id: "fix", label: "Use the Reviewer's fix", says: "@Reviewer Use your fix. Keep the shared employer, drop the line about Alex." },
  { id: "edit", label: "I'll edit it", says: "@Reviewer I'll rewrite that line myself." },
  { id: "reject", label: "Reject the draft", says: "@Builder Reject it. I'll check with Alex before we write to Jonah." },
];

/** Renders @mentions as highlighted names. */
function Text({ text }: { text: string }) {
  return <>{text.split(/(@\w+)/g).map((part, i) => (part.startsWith("@") ? <span key={i} className={`mention ${part === "@You" ? "me" : ""}`}>{part}</span> : <Fragment key={i}>{part}</Fragment>))}</>;
}

function Avatar({ who, kind }: { who: string; kind: "agent" | "person" }) {
  return <span className={`avatar ${kind}`} aria-hidden>{who.charAt(0)}</span>;
}

/**
 * A Band-style room: the crew posts as it works, the Reviewer @mentions the person on an
 * unsourced claim, and the person's decision is recorded in the room. Sample data.
 */
export function BandRoom() {
  const { s, decideInRoom, busy } = useRun();
  const ask = s.room.find((r) => r.decision);
  const m = ask && s.messages.find((x) => x.id === ask.decision!.messageId);
  const lead = m && s.leads.find((l) => l.id === m.leadId);
  const decided = s.roomDecision;
  const fixed = !!m && m.status !== "rejected" && (m.status === "edited" || !!s.msgUi[m.id]?.edited) && !m.body.includes(FLAG);
  const approved = !!m && (m.status === "approved" || m.status === "sent");
  const first = lead?.person.name.split(" ")[0] ?? "the buyer";

  // What happens after the question, derived from run state so it stays true to what the person did.
  const after: RoomPost[] = [];
  if (decided) after.push({ id: "d1", who: "You", kind: "person", at: decided.at, text: CHOICES.find((c) => c.id === decided.choice)!.says, mentions: [] });
  if (m && fixed) after.push({ id: "d2", who: "Reviewer", kind: "agent", at: m.decidedAt ?? decided?.at,
    text: `Rechecked the ${lead?.company.name} draft. Every claim now matches a source. @You it's ready for your approval.` });
  if (m && approved) {
    after.push({ id: "d3", who: "Security", kind: "agent", at: m.decidedAt,
      text: `You approved it. It went to a teammate's inbox, not to ${first}.` });
    after.push({ id: "d4", who: "Builder", kind: "agent", at: m.decidedAt,
      text: `Moved ${lead?.company.name} to Contacted: agent drafted, rep approved.` });
  }
  if (m && m.status === "rejected") after.push({ id: "d5", who: "Builder", kind: "agent", at: m.decidedAt,
    text: `Noted. ${lead?.company.name} stays in Matched and nothing was sent.` });

  const posts = [...s.room, ...after];
  const log = useRef<HTMLDivElement>(null);
  // Keep the newest post in view as the room grows.
  useEffect(() => { const el = log.current; if (el && after.length) el.scrollTop = el.scrollHeight; }, [after.length]);
  const needsYou = !!ask && !decided && !fixed && m?.status !== "rejected" && !approved;

  return (
    <div className="room card" aria-label="Band room">
      <header className="roomhead">
        <div className="stack tight">
          <div className="row gap"><span className="hash" aria-hidden>#</span><b>captain-gtm</b>{needsYou && <span className="needs">Needs you</span>}</div>
          <span className="small muted">Band room · 4 agents, 1 person</span>
        </div>
        <div className="avatars" aria-label="Members">
          {CREW.map((c) => <span key={c.name} title={c.name}><Avatar who={c.name} kind={c.kind} /></span>)}
        </div>
      </header>

      <div className="roomlog" role="log" ref={log}>
        {posts.map((p) => (
          <div key={p.id} className={`rpost ${p.mentions?.includes("You") ? "atme" : ""} ${p.kind}`}>
            <Avatar who={p.who} kind={p.kind} />
            <div className="stack tight rbody">
              <div className="row gap"><b>{p.who}</b><span className="small muted">{p.kind === "agent" ? "agent" : "person"}</span>{p.at && <span className="time">{hhmm(p.at)}</span>}</div>
              <span><Text text={p.text} /></span>
              {p.quote && (
                <blockquote className="rquote">
                  <span>“{p.quote.text}”</span>
                  <span className="small"><span className="nosrc">No source</span> {p.quote.note}</span>
                </blockquote>
              )}
              {p.decision && (
                <div className={`decision ${decided ? "closed" : ""}`}>
                  <div className="row between"><b className="small">Decision · only a person can answer</b>{decided && <span className="status ok">Decided by you · {hhmm(decided.at)}</span>}</div>
                  {!decided ? (
                    <div className="row gap wrap">
                      {CHOICES.map((c) => (
                        <button key={c.id} type="button" className={`btn tiny ${c.id === "fix" ? "primary" : c.id === "reject" ? "ghost" : ""}`} disabled={busy || !needsYou} onClick={() => decideInRoom(c.id)}>{c.label}</button>
                      ))}
                    </div>
                  ) : (
                    <span className="small">{CHOICES.find((c) => c.id === decided.choice)!.label}</span>
                  )}
                  {!decided && !needsYou && <span className="small muted">Already handled in the review queue.</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <footer className="small muted roomfoot">Sample data · live Band sync in our build plan</footer>
    </div>
  );
}
