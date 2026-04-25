/**
 * Tag-driven question mapper for the Story Library.
 *
 * Pure function: given a story's tags, returns up to `max` common
 * interview questions the story could answer. No AI calls, no I/O,
 * no clock or storage reads — fully deterministic so tests are simple.
 *
 * When a story has multiple tags, questions covered by more of those
 * tags rank higher (so a `leadership + conflict` story surfaces "leading
 * a peer who pushed back" before tag-specific filler).
 */
import type { Story, StoryTag } from "@/lib/stories/storage";

export interface MappedQuestion {
  question: string;
  matchedTags: StoryTag[];
}

/**
 * Tag → questions dictionary. Each question lives under every tag it
 * legitimately answers; the mapper dedupes and ranks by overlap. Keep
 * questions terse and recruiter-realistic — these are the actual prompts
 * students get asked, not generic prep filler.
 */
const TAG_QUESTIONS: Record<StoryTag, readonly string[]> = {
  leadership: [
    "Tell me about a time you led a team through a difficult project.",
    "Describe leading without authority.",
    "How did you motivate a team that was burned out?",
    "Tell me about a time you set the direction for a group.",
    "Walk me through a decision you made as a leader that wasn't popular.",
    "Describe building a team from scratch.",
  ],
  conflict: [
    "Tell me about a disagreement with a peer.",
    "How do you handle a teammate who isn't pulling their weight?",
    "Describe a time you pushed back on a manager's decision.",
    "Walk me through a conflict you resolved.",
    "Tell me about a time you had to deliver tough feedback.",
    "Describe working with someone you didn't get along with.",
  ],
  technical: [
    "Walk me through a hard technical decision.",
    "Describe a project where you had to learn something new fast.",
    "Tell me about debugging a tough issue.",
    "Walk me through a system you designed end-to-end.",
    "Tell me about a tradeoff you made between speed and quality.",
    "Describe your most technically challenging project.",
  ],
  failure: [
    "Tell me about a time you failed.",
    "Describe a project that didn't go as planned.",
    "When have you missed a deadline?",
    "Tell me about a mistake and what you learned.",
    "Walk me through a decision you'd make differently today.",
    "Describe a time your plan didn't survive contact with reality.",
  ],
  ambiguity: [
    "Describe working with unclear requirements.",
    "How do you operate without clear direction?",
    "Tell me about scoping a vague problem.",
    "Walk me through a project where the goalposts kept moving.",
    "Describe a time you had to make decisions with incomplete information.",
    "How do you start when you don't know where to start?",
  ],
  deadline: [
    "Describe juggling competing priorities.",
    "Tell me about a time you had to deliver under pressure.",
    "How do you handle being overwhelmed?",
    "Walk me through a sprint that almost slipped.",
    "Describe a time you had to cut scope to ship.",
    "Tell me about your most stressful work week.",
  ],
  teamwork: [
    "Tell me about a successful team project.",
    "Describe a time you helped a teammate.",
    "How do you work with someone different from you?",
    "Walk me through onboarding onto a new team.",
    "Describe sharing credit for a win.",
    "Tell me about a team norm you helped establish.",
  ],
  ownership: [
    "Describe taking initiative on something nobody asked for.",
    "Tell me about going above and beyond.",
    "When have you owned a problem from start to finish?",
    "Walk me through a project you championed.",
    "Tell me about a time you noticed a problem before anyone else.",
    "Describe stepping up when nobody else would.",
  ],
  communication: [
    "Tell me about explaining a technical concept to a non-technical audience.",
    "Describe a difficult conversation.",
    "How do you keep stakeholders aligned?",
    "Walk me through presenting work to senior leaders.",
    "Tell me about a time written communication saved a project.",
    "Describe translating between two groups that didn't understand each other.",
  ],
  creativity: [
    "Describe an unconventional solution.",
    "Tell me about a time you had to think outside the box.",
    "Walk me through a moment of insight.",
    "Tell me about a constraint that forced you to be creative.",
    "Describe a workaround that became the actual solution.",
    "Walk me through reframing a problem.",
  ],
};

/**
 * Cross-tag question seeds — the high-signal prompts that genuinely
 * straddle two themes. We treat them as "honorary" questions for both
 * tags so a leadership+conflict story surfaces them at the top.
 */
const CROSS_TAG_QUESTIONS: ReadonlyArray<{
  question: string;
  tags: readonly StoryTag[];
}> = [
  {
    question:
      "Tell me about a time you led a teammate through a disagreement.",
    tags: ["leadership", "conflict"],
  },
  {
    question:
      "Describe shipping a hard technical project on a tight deadline.",
    tags: ["technical", "deadline"],
  },
  {
    question:
      "Walk me through a failure that taught you to communicate better.",
    tags: ["failure", "communication"],
  },
  {
    question: "Describe owning an ambiguous problem end-to-end.",
    tags: ["ownership", "ambiguity"],
  },
  {
    question:
      "Tell me about a creative solution your team didn't initially buy in to.",
    tags: ["creativity", "teamwork"],
  },
  {
    question:
      "Describe rallying a team when leadership wasn't aligned.",
    tags: ["leadership", "teamwork"],
  },
  {
    question:
      "Walk me through a tough technical call you had to defend.",
    tags: ["technical", "conflict"],
  },
];

const DEFAULT_MAX = 5;

/**
 * Map a story to common interview questions, ranked by tag overlap.
 *
 * Algorithm:
 *   1. For every tag in the story, collect each catalog question and the
 *      set of story tags that match it.
 *   2. Layer in the cross-tag seeds — counted against the story's tags
 *      so multi-tag stories rank them above single-tag filler.
 *   3. Dedupe by question text (case-insensitive), keeping the highest
 *      match-count copy.
 *   4. Sort by match count desc, then by tag-order so output is stable.
 */
export function mapStoryToQuestions(
  story: Story,
  max: number = DEFAULT_MAX,
): MappedQuestion[] {
  if (!story.tags.length || max <= 0) return [];
  const storyTagSet = new Set(story.tags);

  const buckets = new Map<string, MappedQuestion>();

  // Single-tag catalog questions.
  for (const tag of story.tags) {
    const list = TAG_QUESTIONS[tag];
    if (!list) continue;
    for (const q of list) {
      addQuestion(buckets, q, [tag], storyTagSet);
    }
  }

  // Cross-tag seeds — only count tags that appear on the story.
  for (const { question, tags } of CROSS_TAG_QUESTIONS) {
    const matched = tags.filter((t) => storyTagSet.has(t));
    if (matched.length === 0) continue;
    addQuestion(buckets, question, matched, storyTagSet);
  }

  return Array.from(buckets.values())
    .sort((a, b) => {
      if (b.matchedTags.length !== a.matchedTags.length) {
        return b.matchedTags.length - a.matchedTags.length;
      }
      return a.question.localeCompare(b.question);
    })
    .slice(0, max);
}

function addQuestion(
  buckets: Map<string, MappedQuestion>,
  question: string,
  matched: readonly StoryTag[],
  storyTagSet: Set<StoryTag>,
): void {
  const key = question.toLowerCase();
  const existing = buckets.get(key);
  // Only count tags that the story actually has — matters for cross-tag
  // seeds where we pass two tags but the story might only own one.
  const hits = matched.filter((t) => storyTagSet.has(t));
  if (hits.length === 0) return;
  if (!existing) {
    buckets.set(key, { question, matchedTags: Array.from(new Set(hits)) });
    return;
  }
  // Merge — union of matched tags, dedup, keep first-seen question text.
  const merged = Array.from(new Set([...existing.matchedTags, ...hits]));
  buckets.set(key, { question: existing.question, matchedTags: merged });
}
