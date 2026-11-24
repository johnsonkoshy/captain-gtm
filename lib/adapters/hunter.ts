import "server-only";
import { env, type AdapterMode } from "../env";
import type { EmailStatus, Lead } from "../types";

/** Hunter.io: work-email verification. Seed mode keeps the seed status. */
export const mode = (): AdapterMode => (env.hunterKey ? "live" : "seed");

export async function enrich(leads: Lead[]): Promise<Lead[]> {
  if (mode() === "seed") return leads;
  // Live path (written, untested without a key). .example domains will come back unknown.
  return Promise.all(leads.map(async (l) => {
    try {
      const u = new URL("https://api.hunter.io/v2/email-verifier");
      u.searchParams.set("email", l.person.email);
      u.searchParams.set("api_key", env.hunterKey!);
      const r = await fetch(u);
      const j = (await r.json()) as { data?: { status?: string } };
      const s = j.data?.status;
      const emailStatus: EmailStatus = s === "valid" ? "verified" : s ? "unverified" : "unknown";
      return { ...l, person: { ...l.person, emailStatus } };
    } catch { return l; }
  }));
}
