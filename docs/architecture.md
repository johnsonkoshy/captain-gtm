# Architecture

## Shape

The app is a Next.js App Router project. **Run state lives in the client** (`RunProvider`, persisted to sessionStorage). **Route handlers are stateless**: input comes in, and they return adapter results plus `Event` records. This keeps the app correct on serverless hosts and maps cleanly onto Captain's loop model later. Every sponsor sits behind an adapter in `lib/adapters/` with a seed fallback. An adapter's interface is the contract, so a seed-backed adapter and a live one can be swapped.

## Query logic

1. **ICP** (`/api/run/icp`): the Planner (LLM adapter) turns the intake into `ICP`: industries, size bands, personas, triggers, a 0–1 confidence per field, and suggested expansion segments. A person accepts, adjusts or dismisses each segment.
2. **Discovery** (`/api/run/discovery`): the Builder searches public pages (Tavily) once per trigger event and keeps only hits that have a URL. Leads with negative signals (hiring freeze, acquisition) are dropped and listed with the reason. Fit (0–100) and tier (A/B/C) rank the rest. Hunter verifies the work email. The Flexprice gate charges 2 credits per lead before enrichment.
3. **Warm intros** (`/api/run/graph`): one multi-hop Cypher query, at 1 credit:

```cypher
MATCH (me:Person {team: true})
  -[:previously_employed_at]->(past:Company)
  <-[:previously_employed_at]-(buyer:Person)
  -[:works_at]->(lead:Company)
WHERE (lead)-[:matched_to]->(:Product {name: "Captain"})
RETURN me, past, buyer, lead
```

4. **Drafts** (`/api/run/drafts`): the Builder writes a first touch from each lead's own signals and records them in `signalsUsed`. The Reviewer checks every claim against its source and flags any claim without one. The Security agent checks what each draft shares.
5. **Send** (`/api/send`): a person approves, and the message goes to a teammate on the allowlist. Stage moves to Contacted with `movedBy: agent-rep`, and 1 credit is charged.

## The graph

Nodes are **Company, Person, Product, Competitor and Signal**. Edges are **works_at, competes_with, matched_to, contacted_via, replied_to and previously_employed_at**.

- `(Person)-[:works_at]->(Company)`
- `(Company)-[:matched_to]->(Product {name: "Captain"})`
- `(Product)-[:competes_with]->(Competitor)`
- `(Person)-[:previously_employed_at]->(Company)`, for teammates (`team: true`) and buyers
- `(Person)-[:contacted_via]->(Message)` and `(Person)-[:replied_to]->(Message)`, planned for when the outbox writes back
- Signal nodes carry `source`, the URL that backs them.

In seed mode, `seed/index.ts → seedGraph()` builds the same graph in memory.

## The agents' loop

| Agent | Does | Never does |
|---|---|---|
| **Planner** | Reads the intake, writes the ICP and expansions | Send anything |
| **Builder** | Searches, enriches, writes the graph, runs queries, drafts | Approve its own drafts |
| **Reviewer** | Checks each claim against its source; asks people in the Band room | Approve or send |
| **Security** | Checks what a draft shares (work details only, no outbound links) | Approve or send |
| **Person** | Accepts or adjusts the ICP; approves, edits or rejects each draft | — |

The loop runs Plan → Build → Review/Security → **person decides** → record. Each step emits `Event { at, actor, action, leadId?, cost? }`. The actor is `agent:<name>` or `person:<name>`. The Agent Thinking feed and the audit log both read from these events.

Board 5's shape lists message status as `draft|approved|edited|rejected|sent`. Here, `approved` means a person said yes but nothing was delivered (dry run). `sent` means the mailer delivered the message to a teammate. "Agent drafted, rep approved" is derived from `message.draftedBy` (an agent) and `decidedBy` (a person).

## Sponsor services

- **Tavily**: search with source links (`lib/adapters/tavily.ts`)
- **Hunter.io**: email verification (`hunter.ts`)
- **Neo4j AuraDB**: the graph and the warm-intro query (`neo4j.ts`)
- **Flexprice**: per-action metering and the credit gate (`flexprice.ts`; the live call is a stub)
- **Band**: the room where the Reviewer asks a person (`band.ts`; the live call is a stub)
- **Claude**: the Planner's and Builder's reasoning (`llm.ts`)
