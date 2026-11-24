import { NextResponse } from "next/server";
import * as llm from "@/lib/adapters/llm";
import * as tavily from "@/lib/adapters/tavily";
import * as hunter from "@/lib/adapters/hunter";
import * as neo4j from "@/lib/adapters/neo4j";
import * as flexprice from "@/lib/adapters/flexprice";
import * as band from "@/lib/adapters/band";
import * as mailer from "@/lib/adapters/mailer";

export const dynamic = "force-dynamic";

/** Which adapters run live and which on seed data. No secrets in the response. */
export function GET() {
  return NextResponse.json({
    llm: llm.mode(), tavily: tavily.mode(), hunter: hunter.mode(), neo4j: neo4j.mode(),
    flexprice: flexprice.LIVE_IMPLEMENTED ? flexprice.mode() : "seed",
    band: band.LIVE_IMPLEMENTED ? band.mode() : "seed",
    mailer: mailer.mode(),
  });
}
