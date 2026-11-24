import "server-only";
import { env, type AdapterMode } from "../env";
import { PRICES, WALLET } from "../types";

/**
 * Flexprice: usage metering and a credit wallet.
 *
 * Today this meters against a local wallet whose usage the client reports (sample data).
 * The live path is in our build plan. The calls it will make, from Flexprice's official
 * API reference, are listed in docs/integrations.md (event ingest on POST /v1/events,
 * real-time balance on GET /v1/wallets/{id}/balance/real-time).
 */
export const mode = (): AdapterMode => (env.flexpriceKey && env.flexpriceCustomer ? "live" : "seed");
export const LIVE_IMPLEMENTED = false;

export type Meter = keyof typeof PRICES;

export function balance(usedSoFar: number, wallet: number = WALLET): number {
  return Math.max(0, wallet - usedSoFar);
}

/** How many units of a meter the balance still covers. */
export function affordable(meter: Meter, usedSoFar: number, wallet: number = WALLET): number {
  return Math.floor(balance(usedSoFar, wallet) / PRICES[meter]);
}

/** Credit gate: throws when the action would overdraw the wallet. */
export function gate(meter: Meter, units: number, usedSoFar: number, wallet: number = WALLET) {
  const cost = PRICES[meter] * units;
  if (balance(usedSoFar, wallet) < cost) {
    throw new CreditError(`Not enough credits for ${meter}: needs ${cost}, ${balance(usedSoFar, wallet)} left. Enrichment pauses at 0 credits.`);
  }
  return cost;
}

export async function record(meter: Meter, units: number): Promise<{ cost: number }> {
  return { cost: PRICES[meter] * units };
}

export class CreditError extends Error {}
