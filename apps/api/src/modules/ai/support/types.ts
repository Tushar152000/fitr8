import type { AiResult } from "../extraction/types.js";

export interface SupportFact {
  question: string;
  answer: string;
}

export interface SupportTurn {
  role: "user" | "assistant";
  text: string;
}

/** What the model decided: an answer (with questions the visitor may ask next), or "not in the FAQ". */
export interface SupportModelReply {
  reply: string;
  /** Follow-up questions the model suggests; the caller keeps only those that are real FAQ questions. */
  followUps: string[];
  noAnswer: boolean;
}

/**
 * Writes the website support bot's reply. Behind a port so the vendor can change (or be mocked)
 * without touching the support module, like FOOD_EXTRACTOR.
 *
 * `grounding: "all"` models read the whole FAQ (cached in the prompt) and find the answer themselves;
 * `"matches"` (the mock) only sees what the keyword search found.
 */
export interface SupportAnswerer {
  readonly name: string;
  readonly grounding: "all" | "matches";
  answer(input: {
    /** The whole FAQ, in a fixed order so the prompt cache hits. */
    knowledge: SupportFact[];
    /** The best keyword-search matches for this question (may be empty). */
    matches: SupportFact[];
    history: SupportTurn[];
    message: string;
  }): Promise<AiResult<SupportModelReply>>;
}

export const SUPPORT_ANSWERER = Symbol("SUPPORT_ANSWERER");
