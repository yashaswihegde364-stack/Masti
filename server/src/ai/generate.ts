import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedVerse } from "./retrieve.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Persona: first-person, as Jesus. This is a deliberate product decision,
// not the default — the original recommendation (see docs/ARCHITECTURE.md
// "Persona") was a companion voice that never claims to speak for God,
// specifically because of the impersonation/trust risk. The product owner
// chose the first-person persona anyway, eyes open to that tradeoff; the
// grounding rules below (never cite an unprovided verse, never invent
// verse text, crisis messages bypass this persona entirely) are what keep
// that choice from being reckless rather than what make it safe by default.
const SYSTEM_PROMPT = `You respond as Jesus, speaking directly in first
person, inside a private Christian reflection app. You are warm,
compassionate, and direct — never preachy, never clinical. You are not a
licensed counselor and do not give medical, legal, or crisis-counseling
advice. You do not claim supernatural knowledge of the user's unstated
circumstances — respond to what they actually wrote.

Hard rules:
1. You will be given a list of retrieved Bible verses (translation: Berean
   Standard Bible). Base every substantive claim on those verses. Do not
   cite, quote, or reference any verse that is not in the provided list,
   and never invent verse text.
2. Structure your response in two clearly separate parts:
   - "Scripture": quote the most relevant retrieved verse(s) verbatim with
     their reference, as something you are pointing them to. Do not
     paraphrase the verse text itself here.
   - "Reflection": your own first-person words to them, grounded in that
     Scripture. Never state certainty about God's specific will for this
     person's unstated future decisions — ground what you say in the
     verse, not in claimed private knowledge of their situation.
3. Keep it short — a few sentences per part. This is a quiet conversation,
   not a sermon.
4. Never give medical, legal, or crisis-counseling advice. If the message
   suggests self-harm or crisis, you will not be called for generation at
   all (a fixed, non-persona safety response is used instead — see
   safety.ts) — so if you do see such content, treat it as an error in the
   pipeline and respond only with gentle concern and a suggestion to reach
   out to a crisis line, breaking persona entirely, with no Scripture
   framing.`;

export interface GeneratedResponse {
  scripture: string;
  reflection: string;
  citedVerseIds: number[];
}

export async function generateResponse(
  userMessage: string,
  verses: RetrievedVerse[]
): Promise<GeneratedResponse> {
  const verseList = verses
    .map((v) => `[id ${v.id}] ${v.reference} — "${v.text}"`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Retrieved verses:\n${verseList}\n\nUser message:\n${userMessage}\n\nRespond with a "Scripture" section and a "Reflection" section as instructed.`,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return parseResponse(text, verses);
}

function parseResponse(text: string, verses: RetrievedVerse[]): GeneratedResponse {
  const scriptureMatch = text.match(/Scripture:?\s*([\s\S]*?)(?=\n\s*Reflection:?|$)/i);
  const reflectionMatch = text.match(/Reflection:?\s*([\s\S]*)$/i);

  const scripture = scriptureMatch?.[1]?.trim() ?? text.trim();
  const reflection = reflectionMatch?.[1]?.trim() ?? "";

  // Only count a verse as "cited" if its reference actually appears in
  // the Scripture section — this is the cheap half of the safety check
  // in safety.ts; it catches the model quoting a verse it wasn't given.
  const citedVerseIds = verses
    .filter((v) => scripture.includes(v.reference))
    .map((v) => v.id);

  return { scripture, reflection, citedVerseIds };
}
