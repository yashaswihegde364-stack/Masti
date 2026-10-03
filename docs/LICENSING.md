# Bible text licensing

**Decision for MVP: Berean Standard Bible (BSB), not WEB.** The brief's
instinct (ship a public-domain translation first) was right, but the
World English Bible specifically turned out not to be the best fit once
actually sourced — see "Why BSB instead of WEB" below. BSB is public
domain worldwide (CC0, dedicated 2023-04-30), no attribution or royalty
required, safe to embed in a commercial subscription app. This is the
single most important decision to lock before building the retrieval
layer, because the translation shapes the schema, the chunking strategy,
and whether launch is legally safe at all — getting it wrong after the
index is built means re-ingesting everything.

Verified via Berean Bible's own licensing page and the Internet Archive's
listing:
- https://berean.bible/licensing.htm — "Licensing is not required for any
  use... attribution is appreciated but not required."
- https://berean.bible/terms.htm
- https://archive.org/details/berean-standard-bible_202403 — "Berean
  Standard Bible - BSB (Public domain)"

## Why BSB instead of WEB

The plan was to use the World English Bible, but it's not actually in the
maintained public-domain Bible dataset this project ingests from
([`scrollmapper/bible_databases`](https://github.com/scrollmapper/bible_databases) —
WEB was present in older snapshots but isn't in the current `master`,
likely dropped over a licensing-status question with WEB's steward,
eBible.org/Michael Paul Johnson). Rather than ship an unverified or
possibly-stale WEB source, we use **BSB (Berean Standard Bible)**, which:

- Is explicitly, recently (2023), and unambiguously dedicated to the
  public domain under CC0 — cleaner provenance than relying on an old
  WEB mirror of uncertain status.
- Reads in natural modern English, which fits the target audience in the
  product brief (young Christians, people returning to the faith) better
  than KJV's archaic register.
- Ships today at `data/bible/bsb/bsb.json` (~31,000 verses, ~8MB),
  sourced directly from `scrollmapper/bible_databases` (`formats/json/BSB.json`).

## Why not NIV/ESV/KJV-with-notes on day one

- NIV: not available through API.Bible's standard commercial licensing;
  requires a direct deal with Biblica.
- ESV: Crossway licenses the ESV API, but commercial/monetized use
  (including subscription apps) requires a separate commercial license,
  not the free tier.
- KJV itself is public domain in the US, but many "KJV" datasets bundle
  copyrighted study notes, cross-references, or formatting — verify any
  dataset's actual license, not just the translation name.

## Current source

`data/bible/bsb/bsb.json` is the BSB text as published in
[`scrollmapper/bible_databases`](https://github.com/scrollmapper/bible_databases)
(`formats/json/BSB.json`), which republishes public-domain translations.
The BSB translation itself (not the repackaging) is what we rely on for
public-domain status — re-verify against berean.bible/licensing.htm if
the exact text ever needs to be re-audited.

## Upgrade path (post-revenue)

Once there's real usage to justify the cost:

1. Add ESV or NIV via API.Bible's commercial tier as a *second* translation,
   never a replacement — let users pick, and keep BSB as the free-tier
   default so the free product never breaks.
2. Re-run ingestion (`npm run ingest:bible -- --translation=ESV`) against
   the new source; the schema already supports multiple translations
   (see `translation` column in `server/src/db/schema.sql`).
3. Confirm the license covers AI retrieval/display use, not just rendering
   full chapters — commercial Bible APIs often distinguish these.

## What this doesn't cover

This is not legal advice. Before shipping with any licensed translation,
have the actual license agreement reviewed — especially the clauses on
AI/ML use, verse-count limits per response, and required attribution text
in-app.
