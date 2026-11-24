"use client";
import { useRun, LABELS, type Screen } from "./RunProvider";

export function Empty({ step }: { step: Screen }) {
  const { go, busy } = useRun();
  return (
    <section>
      <div className="card empty">
        <b>{LABELS[step]} hasn&apos;t run yet.</b>
        <span className="muted">Running it also runs any earlier steps that haven&apos;t run.</span>
        <button type="button" className="btn primary" disabled={busy} onClick={() => go(step)}>{busy ? "Working…" : `Run up to ${LABELS[step]}`}</button>
      </div>
    </section>
  );
}
