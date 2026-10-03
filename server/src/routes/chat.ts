import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { classify } from "../ai/classify.js";
import { retrieveVerses } from "../ai/retrieve.js";
import { generateResponse } from "../ai/generate.js";
import { checkResponse, CRISIS_RESPONSE } from "../ai/safety.js";

export const chatRouter = Router();
chatRouter.use(requireAuth);

const bodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});

chatRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { message } = parsed.data;
  const userId = req.userId!;

  const conversationId = await resolveConversation(parsed.data.conversationId, userId);
  await saveMessage(conversationId, "user", message, []);

  // classify -> retrieve -> generate -> safety, per docs/ARCHITECTURE.md
  const { isCrisis, situation } = classify(message);

  if (isCrisis) {
    await saveMessage(conversationId, "assistant", CRISIS_RESPONSE.reflection, []);
    res.json({ conversationId, ...CRISIS_RESPONSE, flagged: ["crisis"] });
    return;
  }

  const verses = await retrieveVerses(message, situation);
  const generated = await generateResponse(message, verses);
  const safety = checkResponse(generated, verses);

  await saveMessage(
    conversationId,
    "assistant",
    `${generated.scripture}\n\n${generated.reflection}`,
    generated.citedVerseIds
  );

  res.json({
    conversationId,
    scripture: generated.scripture,
    reflection: generated.reflection,
    verses: verses.filter((v) => generated.citedVerseIds.includes(v.id)),
    flagged: safety.flags,
  });
});

async function resolveConversation(
  conversationId: string | undefined,
  userId: string
): Promise<string> {
  if (conversationId) return conversationId;

  const { rows } = await pool.query(
    `insert into conversations (user_id) values ($1) returning id`,
    [userId]
  );
  return rows[0].id as string;
}

async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  citedVerseIds: number[]
) {
  await pool.query(
    `insert into messages (conversation_id, role, content, cited_verse_ids)
     values ($1, $2, $3, $4)`,
    [conversationId, role, content, citedVerseIds]
  );
}
