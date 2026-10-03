import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "../db/pool.js";
import { embedTexts } from "./embed.js";
import { TOPIC_SEEDS } from "./topics.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "../../../data/bible/bsb/bsb.json");
const TRANSLATION = "BSB";
const EMBED_BATCH_SIZE = 96; // Voyage AI's per-request input limit is generous; keep batches modest.

interface BsbBook {
  name: string;
  chapters: { chapter: number; verses: { verse: number; text: string }[] }[];
}

interface BsbFile {
  translation: string;
  books: BsbBook[];
}

function normalizeBookName(name: string): string {
  return name
    .replace(/^I /, "1 ")
    .replace(/^II /, "2 ")
    .replace(/^III /, "3 ")
    .replace(/^Revelation of John$/, "Revelation");
}

interface VerseRow {
  book: string;
  bookOrder: number;
  chapter: number;
  verse: number;
  text: string;
}

async function upsertVerses(rows: VerseRow[]): Promise<number[]> {
  if (rows.length === 0) return [];

  const values: unknown[] = [];
  const tuples = rows.map((r, i) => {
    const base = i * 6;
    values.push(TRANSLATION, r.book, r.bookOrder, r.chapter, r.verse, r.text);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
  });

  const { rows: inserted } = await pool.query(
    `insert into verses (translation, book, book_order, chapter, verse, text)
     values ${tuples.join(",")}
     on conflict (translation, book, chapter, verse)
       do update set text = excluded.text, book_order = excluded.book_order
     returning id`,
    values
  );

  return inserted.map((r) => r.id as number);
}

async function embedAndStore(verseIds: number[], texts: string[]) {
  for (let i = 0; i < verseIds.length; i += EMBED_BATCH_SIZE) {
    const idBatch = verseIds.slice(i, i + EMBED_BATCH_SIZE);
    const textBatch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedTexts(textBatch, "document");

    const values: unknown[] = [];
    const tuples = idBatch.map((id, j) => {
      const base = j * 2;
      values.push(id, `[${embeddings[j].join(",")}]`);
      return `($${base + 1}, $${base + 2})`;
    });

    await pool.query(
      `insert into verse_embeddings (verse_id, embedding) values ${tuples.join(",")}
       on conflict (verse_id) do update set embedding = excluded.embedding`,
      values
    );
  }
}

async function seedTopics() {
  for (const topic of TOPIC_SEEDS) {
    const { rows } = await pool.query(
      `insert into topics (slug, label) values ($1, $2)
       on conflict (slug) do update set label = excluded.label
       returning id`,
      [topic.slug, topic.label]
    );
    const topicId = rows[0].id as number;

    for (const { book, chapter, verse, weight } of topic.verses) {
      const normalizedBook = normalizeBookName(book);
      const { rows: verseRows } = await pool.query(
        `select id from verses where translation = $1 and book = $2 and chapter = $3 and verse = $4`,
        [TRANSLATION, normalizedBook, chapter, verse]
      );
      if (verseRows.length === 0) {
        console.warn(`  [topics] could not find ${normalizedBook} ${chapter}:${verse} — skipping`);
        continue;
      }
      await pool.query(
        `insert into topic_verses (topic_id, verse_id, weight) values ($1, $2, $3)
         on conflict (topic_id, verse_id) do update set weight = excluded.weight`,
        [topicId, verseRows[0].id, weight]
      );
    }
  }
  console.log(`Seeded ${TOPIC_SEEDS.length} curated topics.`);
}

async function main() {
  const raw = readFileSync(DATA_PATH, "utf8");
  const bible: BsbFile = JSON.parse(raw);

  console.log(`Ingesting ${bible.translation} (${bible.books.length} books)...`);

  let totalVerses = 0;
  for (let bookIndex = 0; bookIndex < bible.books.length; bookIndex++) {
    const book = bible.books[bookIndex];
    const bookName = normalizeBookName(book.name);
    const bookOrder = bookIndex + 1;

    const rows: VerseRow[] = book.chapters.flatMap((chapter) =>
      chapter.verses.map((v) => ({
        book: bookName,
        bookOrder,
        chapter: chapter.chapter,
        verse: v.verse,
        text: v.text,
      }))
    );

    const ids = await upsertVerses(rows);
    await embedAndStore(ids, rows.map((r) => r.text));

    totalVerses += ids.length;
    console.log(`  ${bookName}: ${ids.length} verses embedded`);
  }

  console.log(`Ingested and embedded ${totalVerses} verses total.`);
  await seedTopics();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
