// The brief. Every word of copy and every brand value on the page lives here,
// so the site can be re-skinned without touching the engine.
//
// Copy is drawn from the Masti repo (README, app onboarding, docs). Quote cards
// are verbatim Berean Standard Bible text from data/bible/bsb/bsb.json, and the
// HUD labels state real facts about the product (31,102 verses, 66 books, BSB,
// retrieval + safety check). Keep it that way: no invented numbers.

export const brief = {
  brand: "Masti",
  division: "Scripture",
  oneLine: "A private space to confess, pray, ask questions, and reflect — with guidance grounded in the Bible.",
  cta: { label: "Begin", href: "#download" },

  palette: {
    base: "#0E0E12",
    text: "#F2F0EA",
    accent: "#C9A24B",
  },

  // System labels from the brand's world. Shown as HUD micro-labels; each
  // chapter decodes in the ones it lists by index.
  hud: [
    "Scripture link • live",
    "Source // Berean Standard Bible",
    "Verses indexed 31,102",
    "Books 66 / 66",
    "Retrieval • grounded",
    "Safety check • on",
    "Daily verse • ready",
    "Session • private",
  ],

  loader: ["Opening Scripture", "Indexing 31,102 verses", "Preparing a quiet space"],

  // One per clip in assets/raw/ (ch01.mp4, ch02.mp4, …), in order.
  chapters: [
    {
      id: "ch01",
      accent: "#C9A24B",
      eyebrow: "● Chapter I • Ember",
      headline: ["Bring what", "you carry."],
      subcopy: "Confess, pray, ask the questions you haven't said out loud. No feed, no audience.",
      hud: [7, 0],
      quotes: [
        {
          label: "Scripture // Matthew 11:28",
          quote: "Come to Me, all you who are weary and burdened, and I will give you rest.",
          attribution: "Matthew 11:28",
          meta: "BSB",
        },
        {
          label: "Scripture // Psalm 34:18",
          quote: "The LORD is near to the brokenhearted; He saves the contrite in spirit.",
          attribution: "Psalm 34:18",
          meta: "BSB",
        },
      ],
    },
    {
      id: "ch02",
      accent: "#E0B95A",
      eyebrow: "● Chapter II • Rise",
      headline: ["Every answer", "in Scripture."],
      subcopy: "Each reply is built on a real, retrieved verse — shown beside it, so you can read the passage yourself.",
      hud: [2, 4, 5],
      // The one big moment: a short white flash at the brightest frame.
      flash: { at: 0.42, width: 0.06 },
      quotes: [
        {
          label: "Scripture // Psalm 119:105",
          quote: "Your word is a lamp to my feet and a light to my path.",
          attribution: "Psalm 119:105",
          meta: "BSB",
        },
        {
          label: "Scripture // Isaiah 40:8",
          quote: "The grass withers and the flowers fall, but the word of our God stands forever.",
          attribution: "Isaiah 40:8",
          meta: "BSB",
        },
      ],
    },
    {
      id: "ch03",
      accent: "#E8D3A0",
      eyebrow: "● Chapter III • Dawn",
      headline: ["A verse to", "begin the day."],
      subcopy: "A daily verse and a quiet journal to write back to it.",
      hud: [6, 3],
      quotes: [
        {
          label: "Scripture // Lamentations 3:22–23",
          quote: "Because of the loving devotion of the LORD we are not consumed, for His mercies never fail. They are new every morning; great is Your faithfulness!",
          attribution: "Lamentations 3:22–23",
          meta: "BSB",
        },
        {
          label: "Scripture // Psalm 5:3",
          quote: "In the morning, O LORD, You hear my voice; at daybreak I lay my plea before You and wait in expectation.",
          attribution: "Psalm 5:3",
          meta: "BSB",
        },
      ],
    },
  ],

  // Sections after the cinematic part. The first two are the centered nav links.
  sections: {
    about: {
      nav: "About",
      eyebrow: "About // Masti",
      // "Dual persona": a grayscale card playing the about.mp4 frame sequence.
      sequence: "about",
      cardLabel: "Grounding • retrieved verse",
      headline: ["Talk about anything.", "Turn to Scripture."],
      body: [
        "Masti replies in first person, as Jesus — and every reply is grounded in a real verse retrieved from the Bible, never improvised theology.",
        "Behind each answer: classify what you wrote, retrieve the passages that speak to it, write the reply over those verses, then check it before it reaches you.",
      ],
    },
    download: {
      nav: "Download",
      eyebrow: "Download // iOS • Android",
      headline: ["A private space", "to pray."],
      actions: [
        { label: "Download for iOS", href: "#" },
        { label: "Get it on Android", href: "#" },
      ],
      note: "Replies are AI-generated, written in first person, and grounded in Scripture. Masti is not a substitute for a pastor, counselor, or emergency services.",
    },
  },
};
