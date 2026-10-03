// Crisis detection runs as a plain keyword/pattern check, not a model
// call — a classifier that can itself be jailbroken or miss on latency
// is the wrong thing to gate safety on. It's intentionally broad
// (over-triggers rather than under-triggers).
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill myself\b/i,
  /\bsuicid/i,
  /\bend my life\b/i,
  /\bwant to die\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bself[- ]harm/i,
  /\bno reason to live\b/i,
];

export type Situation =
  | "confession"
  | "guilt"
  | "anxiety"
  | "gratitude"
  | "grief"
  | "forgiveness"
  | "theological_question"
  | "general";

export interface Classification {
  isCrisis: boolean;
  situation: Situation;
}

// A fast, cheap keyword router for the *topical* side (used to pull in
// curated topic_verses in addition to embedding search). This is not
// trying to be a sophisticated classifier — it's a coarse hint, and the
// retrieval step does the real work via embeddings regardless.
const SITUATION_HINTS: [Situation, RegExp][] = [
  ["confession", /\b(confess|i (cheated|lied|stole|betrayed))\b/i],
  ["guilt", /\b(guilt|ashamed|shame)\b/i],
  ["anxiety", /\b(anxious|anxiety|worried|afraid|scared|panic)\b/i],
  ["gratitude", /\b(grateful|thankful|thank god|blessed)\b/i],
  ["grief", /\b(grief|grieving|died|passed away|loss of)\b/i],
  ["forgiveness", /\b(forgive|forgiveness|can't let go)\b/i],
  ["theological_question", /\b(why does god|does god|is it a sin|what does the bible say)\b/i],
];

export function classify(message: string): Classification {
  const isCrisis = CRISIS_PATTERNS.some((p) => p.test(message));
  const situation = SITUATION_HINTS.find(([, p]) => p.test(message))?.[0] ?? "general";
  return { isCrisis, situation };
}
