import "server-only";
import { env, type AdapterMode } from "../env";
import { assertAllowlisted } from "../rules";

/**
 * Outbox. Not a sponsor: it delivers approved messages to a TEAMMATE on SEND_ALLOWLIST.
 * Only the send route calls this, after the approval and allowlist rules pass.
 * Seed mode (no RESEND_API_KEY) records to an in-memory dry-run outbox.
 */
export const mode = (): AdapterMode => (env.resendKey && env.mailFrom ? "live" : "seed");

export interface OutboxItem { to: string | null; subject: string; body: string; at: string; delivered: boolean }
const g = globalThis as unknown as { __outbox?: OutboxItem[] };
export const outbox = (g.__outbox ??= []);

export async function deliver(to: string | null, subject: string, body: string): Promise<OutboxItem> {
  const item: OutboxItem = { to, subject, body, at: new Date().toISOString(), delivered: false };
  if (to) assertAllowlisted(to);
  if (to && mode() === "live") {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.mailFrom, to: [to], subject: `[Captain GTM test] ${subject}`, text: body }),
    });
    item.delivered = r.ok;
  }
  outbox.push(item);
  return item;
}
