import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const journalRouter = Router();
journalRouter.use(requireAuth);

const createSchema = z.object({
  prompt: z.string().optional(),
  content: z.string().min(1).max(5000),
  linkedVerseIds: z.array(z.number().int()).default([]),
});

journalRouter.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `select id, prompt, content, linked_verse_ids, created_at
     from journal_entries where user_id = $1
     order by created_at desc limit 100`,
    [req.userId]
  );
  res.json(rows);
}));

journalRouter.post("/", asyncHandler(async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { prompt, content, linkedVerseIds } = parsed.data;

  const { rows } = await pool.query(
    `insert into journal_entries (user_id, prompt, content, linked_verse_ids)
     values ($1, $2, $3, $4) returning id, created_at`,
    [req.userId, prompt ?? null, content, linkedVerseIds]
  );

  res.status(201).json(rows[0]);
}));
