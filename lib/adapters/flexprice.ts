import "server-only";
import { env, type AdapterMode } from "../env";
import { PRICES, WALLET } from "../types";

/**
 * Flexprice: usage metering and a credit wallet.
 * Seed mode meters against a local 60-credit wallet whose usage the caller reports.
 * Live mode is an explicit stub: wire it from Flexprice's official docs at the event
 * (do not guess endpoints). Until then it behaves like seed mode.
 */
export const mode = (): AdapterMode => (env.flexpriceKey && env.flexpriceCustomer ? "live" : "seed");
export const LIVE_IMPLEMENTED = false;

export type Meter = keyof typeof PRICES;

export function balance(usedSoFar: number): number {
  return Math.max(0, WALLET - usedSoFar);
}

/** Credit gate: throws when the action would overdraw the wallet. */
export function gate(meter: Meter, units: number, usedSoFar: number) {
  const cost = PRICES[meter] * units;
  if (balance(usedSoFar) < cost) {
    throw new CreditError(`Not enough credits for ${meter}: needs ${cost}, ${balance(usedSoFar)} left. Enrichment pauses at 0 credits.`);
  }
  return cost;
}

export async function record(meter: Meter, units: number): Promise<{ cost: number }> {
  // TODO(live): send a usage event to Flexprice for env.flexpriceCustomer.
  return { cost: PRICES[meter] * units };
}

export class CreditError extends Error {}
