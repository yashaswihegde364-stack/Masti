# Masti app

Expo (React Native + TypeScript) mobile app. iOS + Android from one
codebase.

## Setup

```bash
npm install
cp .env.example .env    # if you add one; EXPO_PUBLIC_API_URL defaults to localhost:8080
npm start
```

Run the `server` first (see `../server/README.md`) — the app expects an
API at `EXPO_PUBLIC_API_URL` (default `http://localhost:8080`). On a
physical device, set that to your machine's LAN IP, not `localhost`.

## What's here

- `src/navigation/RootNavigator.tsx` — Onboarding → Chat, with Daily
  Verse / Journal / Plus (paywall) reachable from the chat header.
- `src/screens/` — one file per screen, each a plain functional
  component wired directly to `src/api/client.ts`.
- `src/components/AmbientOrb.tsx` — the ambient "presence" animation on
  the chat screen (Reanimated, not literal 3D — see
  `../docs/ARCHITECTURE.md` for why).
- `src/components/ScriptureCard.tsx` — visually distinct card for actual
  retrieved verse text, kept separate from the model's own reflection
  text per the product's core trust promise.

## Known rough edges (intentional, for an MVP)

- Auth is `dev-login`-only (email → JWT, no verification). Fine for
  testing with real strangers before investing in a full auth provider.
- The paywall screen renders the plan comparison but the "Subscribe"
  button is disabled — no payment processor is wired up yet.
