import { NextResponse } from "next/server";
import { leads, messages as seedMessages } from "@/seed";
import { moveStage, pickTeammateRecipient, requirePersonApproval, RuleError } from "@/lib/rules";
import * as mailer from "@/lib/adapters/mailer";
import * as flexprice from "@/lib/adapters/flexprice";
import type { Event } from "@/lib/types";

/**
 * The only path to the mailer. Body: { messageId, subject, body, decidedBy, used }.
 * Any `to` in the request is ignored: the recipient comes from SEND_ALLOWLIST.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { messageId?: string; subject?: string; body?: string; decidedBy?: unknown; used?: number };
  try {
    requirePersonApproval(b.decidedBy);
    const msg = seedMessages.find((m) => m.id === b.messageId);
    const lead = msg && leads.find((l) => l.id === msg.leadId);
    if (!msg || !lead) return NextResponse.json({ error: "unknown message" }, { status: 404 });
    const cost = flexprice.gate("send", 1, Number(b.used ?? 0));
    const to = pickTeammateRecipient(lead);
    const item = await mailer.deliver(to, b.subject ?? msg.subject, b.body ?? msg.body);
    await flexprice.record("send", 1);
    const moved = moveStage(lead, "Contacted", b.decidedBy, msg);
    const channel = msg.channel === "email" ? "email" : "LinkedIn note";
    const where = to ? (item.delivered ? "a teammate's inbox" : "the teammate outbox (dry run, no mail key)") : "the dry-run outbox (SEND_ALLOWLIST is empty)";
    const events: Event[] = [
      { at: item.at, actor: b.decidedBy, action: `Approved the ${channel} to ${lead.person.name}. It went to ${where}, not to ${lead.person.name}.`, leadId: lead.id, cost },
      { at: item.at, actor: "agent:builder", action: `Moved ${lead.company.name} to Contacted: agent drafted, rep approved.`, leadId: lead.id },
    ];
    return NextResponse.json({
      status: item.delivered ? "sent" : "approved",
      decidedAt: item.at, recipient: to ? "teammate" : null, dryRun: !item.delivered,
      lead: { id: moved.id, stage: moved.stage, movedBy: moved.movedBy }, cost, events,
    });
  } catch (e) {
    if (e instanceof RuleError) return NextResponse.json({ error: e.message, rule: e.rule }, { status: 403 });
    if (e instanceof flexprice.CreditError) return NextResponse.json({ error: e.message, rule: "credits" }, { status: 402 });
    throw e;
  }
}
