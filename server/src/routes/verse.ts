import { Router } from "express";
import { pool } from "../db/pool.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const verseRouter = Router();

/**
 * Deterministic "daily verse": picks a verse based on the day of year so
 * every user sees the same one on a given day, no randomness/state
 * needed. Swap for a curated, hand-picked daily list before launch —
 * this modulo-based picker is just enough to make the screen real.
 */
verseRouter.get("/daily", asyncHandler(async (_req, res) => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );

  const { rows } = await pool.query(
    `select id, book, chapter, verse, text from verses
     where translation = 'BSB'
     order by id
     offset ($1 % (select count(*) from verses where translation = 'BSB'))
     limit 1`,
    [dayOfYear]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: "No verses ingested yet — run npm run ingest:bible" });
    return;
  }

  const v = rows[0];
  res.json({ id: v.id, reference: `${v.book} ${v.chapter}:${v.verse}`, text: v.text });
}));

verseRouter.get("/search", asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.status(400).json({ error: "Missing ?q=" });
    return;
  }

  const { rows } = await pool.query(
    `select id, book, chapter, verse, text from verses
     where translation = 'BSB' and text ilike $1
     order by book_order, chapter, verse
     limit 25`,
    [`%${q}%`]
  );

  res.json(
    rows.map((v) => ({
      id: v.id,
      reference: `${v.book} ${v.chapter}:${v.verse}`,
      text: v.text,
    }))
  );
}));
