# Masti

A private, Scripture-grounded Christian AI companion that responds in
first person, as Jesus — a deliberate product decision, made with the
tradeoffs eyes-open; see "Persona" in `docs/ARCHITECTURE.md`. Every
answer is grounded in a real retrieved verse, never improvised theology.

> Talk about anything. Turn to Scripture.
> A private space to confess, pray, ask questions, and reflect — with
> guidance grounded in the Bible.

This repo is the MVP described in `docs/ROADMAP.md`: one chat screen, a
real retrieval-augmented Scripture engine, a daily verse + journal, and a
subscription paywall. No fake 3D, no unlicensed Bible text, no theology
the model is making up on the spot.

## Structure

```
app/      Expo (React Native + TypeScript) mobile app
server/   Node/TypeScript API: Bible retrieval (pgvector) + Claude-based RAG
data/     Bible ingestion scripts and derived data (public-domain BSB text)
docs/     Architecture, licensing, and roadmap notes
site/     Marketing site: scroll-scrubbed cinematic landing page (see site/README.md)
```

## Why these choices

- **Platform**: React Native/Expo — one codebase for iOS + Android, matches
  the App Store/Play Store subscription economics in the product brief.
- **Bible text**: Berean Standard Bible (BSB), public domain (CC0). Ships on day
  one with zero licensing risk. See `docs/LICENSING.md` before adding any
  other translation (ESV/NIV require a commercial license and are *not*
  a drop-in — budget for that only once revenue justifies it).
- **AI**: Claude, speaking first-person as Jesus, but always generating
  over *retrieved* Scripture rather than freelancing theology — the
  persona changed, the grounding didn't. See `docs/ARCHITECTURE.md` for
  the classify → retrieve → generate → safety-check pipeline and the
  "Persona" section on that tradeoff.
- **Animation**: real motion design (Reanimated + Rive/Lottie), not literal
  real-time 3D. See `docs/ARCHITECTURE.md` for why, and where a one-off 3D
  asset (e.g. an onboarding moment) is worth the cost.

## Getting started

See `server/README.md` and `app/README.md` for setup. Short version:

```bash
# 1. Bring up Postgres with pgvector, then:
cd server && cp .env.example .env && npm install && npm run db:migrate && npm run ingest:bible
npm run dev

# 2. In another shell:
cd app && npm install && npm start
```
