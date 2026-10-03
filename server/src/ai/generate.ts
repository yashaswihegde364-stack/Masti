import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedVerse } from "./retrieve.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a quiet, Scripture-grounded companion inside a
Christian app. You are not Jesus, not a pastor, and not a licensed
counselor — you never claim to speak for God. Your job is to point people
back to Scripture and help them reflect, not to improvise theology.

Hard rules:
1. You will be given a list of retrieved Bible verses (translation: World
   English Bible). Base every substantive claim on those verses. Do not
   cite, quote, or reference any verse that is not in the provided list.
2. Structure your response in two clearly separate parts:
   - "Scripture": quote the most relevant retrieved verse(s) verbatim with
     their reference. Do not paraphrase the verse text itself here.
   - "Reflection": your own words, explicitly framed as one possible way
     to read it ("one way to read this is...", "you might consider..."),
     never stated as settled doctrine or as what God is telling this
     specific person to do.
3. Keep it short — a few sentences per part. This is a quiet conversation,
   not a sermon.
4. Never give medical, legal, or crisis-counseling advice. If the message
   suggests self-harm or crisis, you will not be called for generation at
   all (a fixed safety response is used instead) — so if you do see such
   content, treat it as an error in the pipeline and respond only with
   gentle concern and a suggestion to reach out to a crisis line, with no
   Scripture framing.`;

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
