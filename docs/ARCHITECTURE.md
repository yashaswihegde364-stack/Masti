# Architecture

## Principle

The model never improvises theology. Every substantive response is
grounded in Scripture that was actually retrieved, not recalled from
parametric memory. The app is explicit, in the UI, about the difference
between:

- **Scripture says** — the retrieved verse text, quoted, cited by
  reference.
- **A possible Christian interpretation/application** — the model's
  generated reflection, visually distinguished (different card style) from
  the verse itself.

## Pipeline (`server/src/ai/`)

```
user message
   │
   ▼
classify.ts     — intent/situation classification (confession, guilt,
   │               anxiety, gratitude, theological question, crisis/
   │               self-harm → route to a safety response, not generation)
   ▼
retrieve.ts      — embed the message, pgvector similarity search over
   │               data/bible/web (plus a curated topical index for
   │               common situations), return top-k verses with refs
   ▼
generate.ts      — Claude call, system prompt constrains the model to
   │               ground claims in the retrieved verses, forces the
   │               Scripture/interpretation split in its output structure
   ▼
safety.ts        — crisis-language check runs *before* generation (see
                    classify.ts); a second pass here validates the
                    response actually cited the retrieved verses and
                    didn't invent a reference
```

This is intentionally a pipeline of small, inspectable steps rather than
one big prompt — each stage is independently testable, and `retrieve.ts`
can be swapped (e.g. add a second translation) without touching
`generate.ts`.

### Crisis handling

`classify.ts` runs a self-harm/crisis check before anything else. If it
matches, the pipeline short-circuits to a fixed, human-reviewed response
with crisis resources (not a generated one) — this is not something to
leave to the model's judgment call at response time.

### Embeddings

Retrieval uses Voyage AI embeddings (Anthropic's recommended embedding
provider for RAG) over verse-level chunks plus a few-verse sliding window,
so a search for "I cheated on my wife" surfaces passages even when no
single verse contains those words. See `server/src/bible/ingest.ts`.

## Data model

`server/src/db/schema.sql`:

- `verses` — `(translation, book, chapter, verse, text)`, one row per
  verse, keyed so multiple translations can coexist.
- `verse_embeddings` — `(verse_id, embedding vector(1024))`, pgvector
  index for similarity search.
- `topics` / `topic_verses` — a curated mapping for common situations
  (guilt, anxiety, forgiveness, grief) that supplements pure embedding
  search; this is where "good RAG, not bullshitting" mostly comes from —
  curation matters as much as retrieval math for a corpus this small
  (~31,000 verses fits in memory; this isn't a big-data problem, it's a
  careful-curation problem).
- `journal_entries`, `conversations`, `messages`, `users`,
  `subscriptions` — standard app tables.

## Animation

"3D animations like the $1000s apps" almost never means literal real-time
3D rendering (Three.js/Unity scenes) in production consumer apps — that's
heavy on bundle size, battery, and GPU on low-end Android devices, and
rarely improves the actual experience of a chat/journal app. What those
apps actually ship is:

- High-production **motion design**: Lottie/Rive files for
  micro-interactions (button states, transitions, the breathing/listening
  indicator while the AI is "thinking").
- Physically-plausible **spring/gesture physics** via Reanimated + Gesture
  Handler, not literal 3D geometry.
- Occasionally, one hero 3D asset (e.g. an onboarding sequence) rendered
  as a pre-baked video/Lottie rather than live 3D, which gets 95% of the
  visual impact at a fraction of the engineering and runtime cost.

`app/src/components/AmbientOrb.tsx` is the first real example: a
Reanimated-driven ambient "presence" animation (breathing glow + particle
drift) used on the chat screen while waiting for a response — built with
real spring physics, not a static spinner, and cheap enough to run at 60fps
on a mid-range phone. Rive/Lottie assets slot in alongside it once a
designer produces them; the component is structured so a Lottie file can
replace the procedural animation without changing the screen around it.

## What's deliberately not built yet

- Payments are stubbed (`server/src/routes/subscription.ts`) behind a
  clear interface so Stripe or RevenueCat can be dropped in — wiring a
  real payment processor before the product itself is validated is wasted
  work per the MVP philosophy in `docs/ROADMAP.md`.
- Only one translation (BSB) is ingested. See `docs/LICENSING.md`.
- Auth is a minimal JWT stub, not a full identity provider integration —
  swap for Clerk/Supabase once the app has real users.
