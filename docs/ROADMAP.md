# Roadmap

## MVP (this repo)

One beautiful chat screen, real Scripture retrieval, prayer/reflection,
auth stub, subscription paywall UI (no live billing yet). Goal: get it in
front of strangers in the US App Store / Play Store and see if they use
it, before spending more on production animation, a licensed translation,
or a second platform.

- [x] Repo scaffold, architecture + licensing decisions documented
- [x] Postgres + pgvector schema, BSB Bible ingestion
- [x] RAG pipeline: classify → retrieve → generate → safety
- [x] Expo app: onboarding, chat, daily verse, journal, paywall screens
- [ ] Real Claude API key wired in (currently reads `ANTHROPIC_API_KEY`
      from env; nothing hardcoded)
- [ ] Deploy server (Fly.io/Railway/Render all fine for this scale)
- [ ] TestFlight / internal Play Store track with ~20-50 real users

## Pricing (from the product brief)

- Free: 5 conversations/month, Scripture search, daily verse
- $4.99/month or $39.99/year: unlimited conversations, guided confession,
  prayer generation, personal journal, conversation history

Keep the free tier genuinely useful — it's the only way anyone evaluates
whether to pay, and a free tier that feels like a demo kills conversion
before paid even gets tested.

## Post-MVP, in rough order

1. Wire a real payment processor (Stripe for web, RevenueCat if also
   handling App Store/Play Store IAP) behind the existing
   `subscription.ts` interface.
2. Swap the auth stub for Clerk or Supabase Auth.
3. Commission real motion-design assets (Rive/Lottie) for the chat
   "listening" state, onboarding, and daily-verse reveal — the procedural
   `AmbientOrb` component is built to be replaceable without touching
   screen layout.
4. Evaluate adding a licensed translation (ESV/NIV) once usage numbers
   justify the license cost — see `docs/LICENSING.md`.
5. Expand the curated topic index in `topics`/`topic_verses` — this is
   higher-leverage than better embeddings for making responses feel
   trustworthy rather than generic.
6. Re-check platform fee structures before modeling unit economics:
   Google Play's fee changes for US-market apps take effect June 30,
   2026; Apple's Small Business Program (15%) applies to qualifying
   developers under its revenue threshold. Don't model against the old
   flat "15-30%" assumption without checking current terms for the
   specific account.

## Explicitly out of scope for MVP

- Real-time 3D rendering (see `docs/ARCHITECTURE.md` on why this is the
  wrong lever for "premium feel" here).
- Multiple Bible translations.
- Web app version (mobile-first per the platform decision).
- Any claim that the app "is" Jesus or speaks for God — the product
  promise is "a private space to confess, pray, and reflect, with
  guidance grounded in Scripture," not a roleplay.
