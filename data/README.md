# Bible data

`bible/bsb/bsb.json` — the Berean Standard Bible (BSB), public domain
(CC0), sourced from
[`scrollmapper/bible_databases`](https://github.com/scrollmapper/bible_databases)
(`formats/json/BSB.json`). 66 books, ~31,000 verses. See
`../docs/LICENSING.md` for why BSB was chosen over the originally-planned
WEB translation.

Structure:

```json
{
  "translation": "BSB: Berean Standard Bible",
  "books": [
    { "name": "Genesis", "chapters": [ { "chapter": 1, "verses": [ { "verse": 1, "text": "..." } ] } ] }
  ]
}
```

`server/src/bible/ingest.ts` reads this file, normalizes book names (`I
John` → `1 John`, `Revelation of John` → `Revelation`), loads every verse
into Postgres, embeds each one via Voyage AI, and seeds the curated
`topics`/`topic_verses` tables from `server/src/bible/topics.ts`.

To re-fetch this file (e.g. the upstream repo updates it):

```bash
curl -o bible/bsb/bsb.json \
  https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/BSB.json
```
