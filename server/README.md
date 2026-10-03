# Masti server

Node/TypeScript API: Scripture retrieval (Postgres + pgvector) and a
Claude-based RAG pipeline for generating grounded responses. See
`../docs/ARCHITECTURE.md` for the full pipeline design.

## Setup

1. Postgres with the `pgvector` extension available (e.g. the
   `pgvector/pgvector` Docker image, or Postgres.app + `CREATE EXTENSION
   vector` on macOS, or a managed provider like Supabase/Neon that bundles
   it).
2. `cp .env.example .env` and fill in `DATABASE_URL`, `ANTHROPIC_API_KEY`,
   `VOYAGE_API_KEY`.
3. `npm install`
4. `npm run db:migrate` — applies `src/db/schema.sql`.
5. `npm run ingest:bible` — loads the public-domain BSB translation from
   `data/bible/bsb/bsb.json` (see `../data/README.md`) and embeds every verse via
   Voyage AI. Takes a few minutes and costs a small amount of Voyage API
   credit (~31,000 verses).
6. `npm run dev` — starts the API on `:8080`.

## Endpoints

| Method | Path                  | Auth | Purpose                                  |
|--------|-----------------------|------|-------------------------------------------|
| POST   | `/auth/dev-login`     | no   | Dev-only email -> JWT (replace before launch) |
| POST   | `/chat`               | yes  | classify -> retrieve -> generate -> safety |
| GET    | `/verse/daily`        | no   | Deterministic daily verse                 |
| GET    | `/verse/search?q=`    | no   | Plain text search over verses             |
| GET    | `/journal`            | yes  | List the user's journal entries           |
| POST   | `/journal`            | yes  | Create a journal entry                    |
| GET    | `/subscription`       | yes  | Current plan status (free until payments are wired up) |
| POST   | `/subscription/checkout` | yes | 501 stub — see `docs/ROADMAP.md`        |

## Tests / sanity checks

There's no test suite yet (the pipeline is new and the priority was
getting something real end-to-end). Before relying on this: hit `/chat`
with a message like "I cheated on my wife, what do I do?" and confirm the
response's "Scripture" section only contains verses that also appear in
the `verses` list returned alongside it — that's the safety check in
`src/ai/safety.ts` working.
