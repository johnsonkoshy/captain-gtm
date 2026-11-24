import "server-only";
import { env, type AdapterMode } from "../env";

/**
 * Band: the room where agents and people talk. Seed mode returns the scripted
 * Reviewer question. Live mode is an explicit stub: Band's SDK is so far known only
 * from third-party listings, so wire it from Band's official docs at the event.
 */
export const mode = (): AdapterMode => (env.bandKey && env.bandRoom ? "live" : "seed");
export const LIVE_IMPLEMENTED = false;

export interface RoomPost { who: string; kind: "agent" | "person"; text: string }

export async function post(p: RoomPost): Promise<RoomPost> {
  // TODO(live): post p to env.bandRoom with the official Band SDK.
  return p;
}

export const ROOM = "#captain-gtm";
