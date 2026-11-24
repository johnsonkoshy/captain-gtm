# Captain GTM

An AI GTM engine for HackwithBay 4.0, built on Captain's model: people are at the helm, agents are on board, and a person approves everything that leaves. The demo input is Captain itself, looking for its own first customers.

The flow is **Intake → ICP (confidence per field) → Discovery (with source links) → Warm intros (knowledge graph) → Review queue (human approval gate) → Pipeline**. Alongside it run an Agent Thinking feed and a Flexprice credits panel.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: every key is optional
npm run dev                  # http://localhost:3000
```

With no keys, the whole demo runs on fictional seed data. Other scripts:

```bash
npm run build        # production build
npm run check:seed   # fails if seed/ has any non-.example domain
```

## Rules the code enforces

All four live in `lib/rules.ts`, and route handlers call them.

1. **Nothing is sent without a person's approval.** `/api/send` is the only path to the mailer. It returns 403 unless `decidedBy` is `person:<name>`; an `agent:*` actor is refused.
2. **Sends go to teammates only.** The server picks the recipient from `SEND_ALLOWLIST`. It ignores any `to` in the request and never uses the lead's email. If the allowlist is empty, the send is a dry run.
3. **Every lead keeps its source link.** `requireSources` rejects leads with no source, for seed and live data alike.
4. **Every move records who made it.** `moveStage` needs an actor and sets `movedBy` to `agent`, `rep`, or `agent-rep` (agent drafted, person approved).

The credit gate: enrichment costs 2 credits, a graph query 1, a send 1, from a 60-credit wallet. Enrichment runs lead by lead until the wallet is empty and pauses the rest; other steps return 402 when they would overdraw it. To show the gate on video, pick **Demo wallet → 8 credits** in the sidebar before Discovery: 4 leads are enriched, 2 wait, then **Top up 20** and **Resume enrichment**.

## Module layout

```
app/
  intake, icp, discovery, intros, review, pipeline/   the six screens (client components)
  api/run/[step]/route.ts   icp | discovery | graph | drafts — stateless, returns data + Event[]
  api/send/route.ts         the approval gate → outbox
  api/status/route.ts       which adapters are live or on seed
components/
  RunProvider.tsx           run state (client, kept in sessionStorage), step runner
  Shell.tsx                 nav, credits panel, Agent Thinking feed
lib/
  types.ts                  shared shapes: ICP, Lead, Message, Stage, Event, Graph
  rules.ts                  the four rules
  env.ts                    server-only env access
  adapters/                 one per service, each server-only, seed fallback when its key is missing
    llm.ts  tavily.ts  hunter.ts  neo4j.ts  flexprice.ts  band.ts  mailer.ts
seed/index.ts               fictional data, *.example domains, no real people
docs/architecture.md        query logic, graph shape, agent loop, sponsor services
```

## What's live and what's on seed data

| Adapter | Env | Status |
|---|---|---|
| LLM (Claude, `@anthropic-ai/sdk`) | `ANTHROPIC_API_KEY` | Live path written; not tested without a key. Falls back to seed on a parse failure or refusal. |
| Tavily | `TAVILY_API_KEY` | Live path written; not tested. Search results are returned alongside the seed leads, so the demo never shows real people. |
| Hunter | `HUNTER_API_KEY` | Live path written (email verifier); not tested. |
| Neo4j | `NEO4J_URI/USERNAME/PASSWORD` | Live path written (MERGE plus the warm-intro query); not tested. |
| Flexprice | `FLEXPRICE_API_KEY`, `FLEXPRICE_CUSTOMER_ID` | **Sample data.** Sidebar credit meter with a local wallet and a working gate: enrichment stops at 0 credits, the rest of the leads wait as "paused", and a person can top up and resume. Live metering is in our build plan; the calls are in `docs/integrations.md`. |
| Band | `BAND_API_KEY`, `BAND_ROOM_ID` | **Sample data.** Band-style room on the review screen: the crew posts as it works, the Reviewer @mentions you on an unsourced claim, and your decision (use the fix, edit, or reject) is recorded in the room. Live sync is in our build plan; the calls are in `docs/integrations.md`. |
| Outbox (not a sponsor) | `SEND_ALLOWLIST`, `RESEND_API_KEY` | Dry-run in-memory outbox; Resend delivery to the allowlist if a key is set. |

`GET /api/status` reports this at runtime. It never returns secrets.

## Next steps (these need your own accounts)

- Create the keys in `.env.example` and test each live path.
- Deploy to Vercel and add the env vars there.
- Connect Snyk to this repo.
- Wire the live Flexprice and Band calls (see `docs/integrations.md`).
