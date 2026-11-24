"use client";
import { useRun } from "@/components/RunProvider";
import { Head, Next } from "@/components/Shell";
import type { Intake } from "@/lib/types";

export default function IntakePage() {
  const { s, update } = useRun();
  const set = (k: keyof Intake) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    update((p) => ({ ...p, intake: { ...p.intake, [k]: e.target.value } }));
  return (
    <section aria-labelledby="h">
      <Head step={1} mod="Module 1" title="Intake" lede="Tell the crew what you sell, the way you would tell a new teammate. Today's demo input is Captain itself." />
      <div className="card stack">
        <label htmlFor="desc" className="label">What does the product do?</label>
        <textarea id="desc" rows={6} value={s.intake.desc} onChange={set("desc")} />
        <div className="grid3">
          <label className="label">Key features<input value={s.intake.features} onChange={set("features")} /></label>
          <label className="label">Current customers<input value={s.intake.customers} onChange={set("customers")} /></label>
          <label className="label">Pricing<input value={s.intake.pricing} onChange={set("pricing")} /></label>
        </div>
      </div>
      <Next to="icp" label="Build the ICP" note="The Planner drafts it from this. Nothing is sent anywhere." />
    </section>
  );
}
