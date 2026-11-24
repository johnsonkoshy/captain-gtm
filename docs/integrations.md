# Flexprice and Band: notes for the live wiring

Today both run on sample data in the UI (credit meter in the sidebar, Band room on the review
screen). These are the calls the live adapters will make, taken from each vendor's official API
reference on 24 Nov 2026. Check them again before wiring; nothing below has been run against a key.

## Flexprice (metering and the credit gate)

Docs: https://docs.flexprice.io (API reference under `api-reference/`).

- Base URL is per region: US `https://us.api.flexprice.io/v1`, India `https://api.cloud.flexprice.io/v1`,
  Canada `https://canada.api.flexprice.io/v1`, EU `https://eu.api.flexprice.io/v1`.
- Auth: header `x-api-key: <FLEXPRICE_API_KEY>`. Server-side only.
- Record usage: `POST /v1/events`, body
  `{ "event_name", "external_customer_id", "event_id", "timestamp", "properties", "source" }`.
  `event_name` and `external_customer_id` are required. Returns 202 (queued, processed async).
  Send both `event_id` and `timestamp` so retries de-duplicate.
  Bulk: `POST /v1/events/bulk` with `{ "events": [...] }` (1 to 1000).
- Our meters map to three event names: `lead_enriched` (2 credits), `graph_query` (1), `message_sent` (1).
- Balance for the gate:
  - Customer by external id: `GET /v1/customers/external/{external_id}` returns `id`.
  - Wallets: `GET /v1/customers/{id}/wallets`, or `GET /v1/customers/wallets?include_real_time_balance=true`
    (which query param takes the external id is not stated in the docs).
  - Live balance: `GET /v1/wallets/{wallet_id}/balance/real-time` returns `real_time_credit_balance`
    (credits, string) and `real_time_balance` (currency). Treat `is_cached_fallback` absent as true.
- Gate logic stays in `lib/adapters/flexprice.ts`: read the balance, enrich only as many leads as it
  covers (`affordable()`), mark the rest `enrichment: "paused"`, then send one event per enriched lead.

## Band (the agent room)

Docs: https://docs.band.ai (formerly docs.thenvoi.com). Agent API.

- Base URL: `https://app.band.ai` (endpoint pages also show `https://api.band.ai`; confirm which works).
- Auth: header `X-API-Key: <BAND_API_KEY>` (an agent key).
- Post as an agent: `POST /api/v1/agent/chats/{chat_id}/messages`, body
  `{ "message": { "content": "@johnson ...", "mentions": [{ "handle": "johnson" }] } }`.
  `mentions` is required and must name current room participants.
- Read replies: `GET /api/v1/agent/chats/{chat_id}/messages?status=all&sort_order=desc`. Only messages
  that @mention the agent are returned, so the person replies with `@Reviewer`.
- Create a room: `POST /api/v1/agent/chats` with `{ "chat": { "title": "captain-gtm" } }`; add members with
  `POST /api/v1/agent/chats/{chat_id}/participants` `{ "participant": { "participant_id": "..." } }`
  (an agent can add sibling agents or its owner).
- No approve/reject endpoint was found. The decision is a post that @mentions the rep, and the rep's
  reply (also an @mention) is read back. The room's task board
  (`/api/v1/agent/chats/{chat_id}/tasks`) can track the open question. The "human in the loop" page
  (https://docs.band.ai/features/human-in-the-loop) mentions `attention` events; read it before wiring.
