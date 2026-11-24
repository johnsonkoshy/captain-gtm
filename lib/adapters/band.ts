import "server-only";
import { env, type AdapterMode } from "../env";
import type { RoomPost } from "../types";

/**
 * Band: the room where agents and people talk. Today the room runs on sample data.
 * The live path is in our build plan; the Agent API calls it will make (post a message
 * with mentions, read replies) are listed in docs/integrations.md.
 */
export const mode = (): AdapterMode => (env.bandKey && env.bandRoom ? "live" : "seed");
export const LIVE_IMPLEMENTED = false;

export type { RoomPost };

export async function post(p: RoomPost): Promise<RoomPost> {
  return { ...p, at: p.at ?? new Date().toISOString() };
}

export const ROOM = "#captain-gtm";
