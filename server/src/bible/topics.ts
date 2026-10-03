// Hand-curated situation -> passage anchors. Per docs/ARCHITECTURE.md,
// this curation matters as much as embedding search for a corpus this
// small — these are well-known, unambiguous references, not guesses.
// Extending this list is the highest-leverage way to make responses feel
// trustworthy (see docs/ROADMAP.md).
export interface TopicSeed {
  slug: string;
  label: string;
  verses: { book: string; chapter: number; verse: number; weight: number }[];
}

export const TOPIC_SEEDS: TopicSeed[] = [
  {
    slug: "confession",
    label: "Confession",
    verses: [
      { book: "1 John", chapter: 1, verse: 9, weight: 1.0 },
      { book: "James", chapter: 5, verse: 16, weight: 0.8 },
      { book: "Psalms", chapter: 32, verse: 5, weight: 0.7 },
    ],
  },
  {
    slug: "guilt",
    label: "Guilt and shame",
    verses: [
      { book: "Romans", chapter: 8, verse: 1, weight: 1.0 },
      { book: "Psalms", chapter: 103, verse: 12, weight: 0.8 },
      { book: "Romans", chapter: 3, verse: 24, weight: 0.6 },
    ],
  },
  {
    slug: "anxiety",
    label: "Anxiety and fear",
    verses: [
      { book: "Philippians", chapter: 4, verse: 6, weight: 1.0 },
      { book: "1 Peter", chapter: 5, verse: 7, weight: 0.9 },
      { book: "Matthew", chapter: 6, verse: 34, weight: 0.7 },
    ],
  },
  {
    slug: "gratitude",
    label: "Gratitude",
    verses: [
      { book: "1 Thessalonians", chapter: 5, verse: 18, weight: 1.0 },
      { book: "Psalms", chapter: 100, verse: 4, weight: 0.8 },
      { book: "Colossians", chapter: 3, verse: 15, weight: 0.6 },
    ],
  },
  {
    slug: "grief",
    label: "Grief and loss",
    verses: [
      { book: "Psalms", chapter: 34, verse: 18, weight: 1.0 },
      { book: "Matthew", chapter: 5, verse: 4, weight: 0.9 },
      { book: "Revelation", chapter: 21, verse: 4, weight: 0.7 },
    ],
  },
  {
    slug: "forgiveness",
    label: "Forgiveness",
    verses: [
      { book: "Matthew", chapter: 6, verse: 14, weight: 1.0 },
      { book: "Ephesians", chapter: 4, verse: 32, weight: 0.8 },
      { book: "Colossians", chapter: 3, verse: 13, weight: 0.8 },
    ],
  },
  {
    slug: "theological_question",
    label: "Theological questions",
    verses: [
      { book: "John", chapter: 14, verse: 6, weight: 0.8 },
      { book: "2 Timothy", chapter: 3, verse: 16, weight: 0.9 },
      { book: "Romans", chapter: 11, verse: 33, weight: 0.6 },
    ],
  },
];
