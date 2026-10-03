import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool.js";

export const authRouter = Router();

const bodySchema = z.object({ email: z.string().email() });

/**
 * Dev-only "magic link"-less login: given an email, upsert a user and
 * hand back a JWT. No password, no verification email — this exists so
 * the app has something to call during development. Replace with a real
 * auth provider before any real user touches this (see docs/ROADMAP.md).
 */
authRouter.post("/dev-login", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email } = parsed.data;
  const { rows } = await pool.query(
    `insert into users (email) values ($1)
     on conflict (email) do update set email = excluded.email
     returning id`,
    [email]
  );

  const userId = rows[0].id as string;
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET ?? "", {
    expiresIn: "30d",
  });

  res.json({ token, userId });
});
