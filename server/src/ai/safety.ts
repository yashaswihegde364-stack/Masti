import type { RetrievedVerse } from "./retrieve.js";
import type { GeneratedResponse } from "./generate.js";

export const CRISIS_RESPONSE = {
  scripture: "",
  reflection:
    "It sounds like you're carrying something very heavy right now. " +
    "This app isn't equipped to help with that safely — please reach out " +
    "to the 988 Suicide & Crisis Lifeline (call or text 988 in the US) or " +
    "a trusted person right now. You matter, and you don't have to carry " +
    "this alone.",
  citedVerseIds: [] as number[],
};

export interface SafetyResult {
  ok: boolean;
  response: GeneratedResponse;
  flags: string[];
}

/**
 * Validates a generated response against the verses it was actually
 * given. This does not re-run the model — it's a cheap, deterministic
 * check that the "Scripture" section didn't invent a reference, run
 * *after* generate.ts, as a second line of defense behind the prompt's
 * own instructions.
 */
export function checkResponse(
  response: GeneratedResponse,
  retrieved: RetrievedVerse[]
): SafetyResult {
  const flags: string[] = [];
  const allowedRefs = new Set(retrieved.map((v) => v.reference));

  const referencePattern = /\b([1-3]?\s?[A-Z][a-z]+)\s(\d{1,3}):(\d{1,3})/g;
  const mentionedRefs = [...response.scripture.matchAll(referencePattern)].map(
    (m) => `${m[1]} ${m[2]}:${m[3]}`
  );

  const unverified = mentionedRefs.filter((ref) => !allowedRefs.has(ref));
  if (unverified.length > 0) {
    flags.push(`unverified_reference:${unverified.join(",")}`);
  }

  if (response.citedVerseIds.length === 0 && retrieved.length > 0) {
    flags.push("no_verse_cited");
  }

  return { ok: flags.length === 0, response, flags };
}
