import "server-only";

/** Server-only env access. Never import this from a client component. */
const v = (k: string) => {
  const x = process.env[k];
  return x && x.trim() ? x.trim() : undefined;
};

export const env = {
  anthropicKey: v("ANTHROPIC_API_KEY"),
  llmModel: v("LLM_MODEL") ?? "claude-opus-5-5",
  tavilyKey: v("TAVILY_API_KEY"),
  hunterKey: v("HUNTER_API_KEY"),
  neo4jUri: v("NEO4J_URI"),
  neo4jUser: v("NEO4J_USERNAME"),
  neo4jPassword: v("NEO4J_PASSWORD"),
  flexpriceKey: v("FLEXPRICE_API_KEY"),
  flexpriceCustomer: v("FLEXPRICE_CUSTOMER_ID"),
  bandKey: v("BAND_API_KEY"),
  bandRoom: v("BAND_ROOM_ID"),
  resendKey: v("RESEND_API_KEY"),
  mailFrom: v("MAIL_FROM"),
  /** Comma-separated teammate addresses. Approved sends go ONLY here. */
  sendAllowlist: (v("SEND_ALLOWLIST") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
};

export type AdapterMode = "live" | "seed";
