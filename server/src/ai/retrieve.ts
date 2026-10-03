import { pool } from "../db/pool.js";
import { embedTexts } from "../bible/embed.js";
import type { Situation } from "./classify.js";

export interface RetrievedVerse {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
  score: number;
}

const TOP_K = 5;

/**
 * Hybrid retrieval: curated topic_verses (if the coarse situation hint
 * matched one) ranked first, backfilled with pgvector cosine similarity
 * search over verse embeddings. Curation wins ties because for a corpus
 * this small, a hand-picked passage for "guilt" is more trustworthy than
 * whatever the embedding model happens to rank first.
 */
export async function retrieveVerses(
  message: string,
  situation: Situation,
  translation = "BSB"
): Promise<RetrievedVerse[]> {
  const curated = await retrieveCurated(situation, translation);
  if (curated.length >= TOP_K) return curated.slice(0, TOP_K);

  const remaining = TOP_K - curated.length;
  const excludeIds = curated.map((v) => v.id);
  const embedded = await retrieveByEmbedding(message, translation, remaining, excludeIds);
  return [...curated, ...embedded];
}

async function retrieveCurated(
  situation: Situation,
  translation: string
): Promise<RetrievedVerse[]> {
  if (situation === "general") return [];

  const { rows } = await pool.query(
    `select v.id, v.book, v.chapter, v.verse, v.text, tv.weight as score
     from topic_verses tv
     join topics t on t.id = tv.topic_id
     join verses v on v.id = tv.verse_id
     where t.slug = $1 and v.translation = $2
     order by tv.weight desc
     limit $3`,
    [situation, translation, TOP_K]
  );

  return rows.map(toRetrievedVerse);
}

async function retrieveByEmbedding(
  message: string,
  translation: string,
  limit: number,
  excludeIds: number[]
): Promise<RetrievedVerse[]> {
  if (limit <= 0) return [];

  const [queryEmbedding] = await embedTexts([message], "query");
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const { rows } = await pool.query(
    `select v.id, v.book, v.chapter, v.verse, v.text,
            1 - (ve.embedding <=> $1) as score
     from verse_embeddings ve
     join verses v on v.id = ve.verse_id
     where v.translation = $2 and v.id <> all($3::bigint[])
     order by ve.embedding <=> $1
     limit $4`,
    [vectorLiteral, translation, excludeIds, limit]
  );

  return rows.map(toRetrievedVerse);
}

function toRetrievedVerse(row: {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  score: number;
}): RetrievedVerse {
  return {
    id: row.id,
    book: row.book,
    chapter: row.chapter,
    verse: row.verse,
    text: row.text,
    reference: `${row.book} ${row.chapter}:${row.verse}`,
    score: row.score,
  };
}
