"use client";
import { useEffect, useRef, useState } from "react";
import { useRun, creditsUsed } from "./RunProvider";
import { PRICES } from "@/lib/types";

/** Counts from the previous value to the new one, so a charge reads as a tick-down on video. */
function useTween(value: number, ms = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value, ms]);
  return shown;
}

/** Shows the last charge or top-up for a moment next to the balance. */
function useDelta(value: number) {
  const prev = useRef(value);
  const [delta, setDelta] = useState<{ n: number; key: number } | null>(null);
  useEffect(() => {
    const d = value - prev.current;
    prev.current = value;
    if (!d) return;
    setDelta({ n: d, key: Date.now() });
    const t = setTimeout(() => setDelta(null), 2200);
    return () => clearTimeout(t);
  }, [value]);
  return delta;
}

const METERS = [
  { key: "enriched", label: "Leads enriched", price: PRICES.enrich, cls: "m-enrich" },
  { key: "graphQueries", label: "Graph queries", price: PRICES.graphQuery, cls: "m-graph" },
  { key: "sent", label: "Messages sent", price: PRICES.send, cls: "m-send" },
] as const;

export function CreditMeter() {
  const { s, busy, topUp, setWallet, resumeEnrichment } = useRun();
  const used = creditsUsed(s.usage);
  const left = Math.max(0, s.wallet - used);
  const shown = useTween(left);
  const delta = useDelta(left);
  const waiting = s.leads.filter((l) => l.enrichment === "paused").length;
  const enrichLeft = Math.floor(left / PRICES.enrich);
  const state = left < PRICES.enrich ? "empty" : enrichLeft <= 3 ? "low" : "ok";
  const pct = (n: number) => `${s.wallet ? (n / s.wallet) * 100 : 0}%`;

  return (
    <section className={`credits ${state}`} aria-label="Credits">
      <div className="row between">
        <b>Credits</b>
        <span className={`cstate ${state}`}>
          {state === "empty" ? "Enrichment paused" : state === "low" ? "Running low" : "Metering on"}
        </span>
      </div>

      <div className="big" aria-live="polite">
        <b>{shown}</b> <span>of {s.wallet} left</span>
        {delta && <span key={delta.key} className={`delta ${delta.n < 0 ? "down" : "up"}`}>{delta.n > 0 ? "+" : "−"}{Math.abs(delta.n)}</span>}
      </div>

      <div className="cbar" role="img" aria-label={`${left} of ${s.wallet} credits left`}>
        <div className="left" style={{ width: pct(left) }} />
        {METERS.map((m) => {
          const n = s.usage[m.key] * m.price;
          return n ? <div key={m.key} className={`used ${m.cls}`} style={{ width: pct(n) }} title={`${m.label}: ${n}`} /> : null;
        })}
      </div>

      <div className="clines">
        {METERS.map((m) => {
          const units = s.usage[m.key];
          return (
            <div key={m.key} className="cline">
              <span className={`cdot ${m.cls}`} aria-hidden />
              <span>{m.label}</span>
              <span className="cunits">{units} × {m.price}</span>
              <b>{units * m.price}</b>
            </div>
          );
        })}
        {s.toppedUp > 0 && (
          <div className="cline"><span className="cdot m-top" aria-hidden /><span>Topped up by you</span><span className="cunits" /><b>+{s.toppedUp}</b></div>
        )}
      </div>

      {state === "empty" || waiting > 0 ? (
        <div className="cgate" role="status">
          <b>{waiting > 0 ? `${waiting} lead${waiting === 1 ? "" : "s"} waiting for credits` : "Out of credits"}</b>
          <span className="small">
            {state === "empty"
              ? "The gate stopped enrichment at 0. Nothing more is looked up or charged until a person tops up."
              : `${enrichLeft} enrichment${enrichLeft === 1 ? "" : "s"} available now.`}
          </span>
          <div className="row gap wrap">
            <button type="button" className="btn tiny amber" onClick={() => topUp(20)}>Top up 20</button>
            {waiting > 0 && left >= PRICES.enrich && (
              <button type="button" className="btn tiny" disabled={busy} onClick={resumeEnrichment}>Resume enrichment</button>
            )}
          </div>
        </div>
      ) : (
        <div className="small muted">
          {state === "low" ? `Enough for ${enrichLeft} more lead${enrichLeft === 1 ? "" : "s"}. ` : ""}Enrichment stops at 0 credits.
        </div>
      )}

      <div className="cfoot">
        <span className="small muted">Sample wallet · live Flexprice metering in our build plan</span>
        {!s.ran.discovery && (
          <details className="demo">
            <summary>Demo wallet</summary>
            <div className="row gap">
              {[60, 8].map((n) => (
                <button key={n} type="button" className={`btn tiny ${s.wallet === n ? "on" : ""}`} onClick={() => setWallet(n)}>{n} credits</button>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
