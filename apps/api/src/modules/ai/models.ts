/**
 * Which model does which job. Set here in code, never from env: env only carries the API key
 * (and AI_PROVIDER picks the vendor). Changing a model is a reviewed code change.
 *
 * OpenAI: extraction (meal photos, labels, typed meals, reminders) on gpt-6.1-terra — built for
 * visual reasoning, half the price of Sol; the coach on gpt-6-luna — high-volume chat whose numbers
 * come from tools. Extraction runs at low effort (perception), the coach at medium.
 */
export const AI_MODELS = {
  anthropic: {
    extraction: "claude-opus-5-5",
    coach: "claude-opus-5-5",
    coachEffort: "medium",
    // The website support bot: short answers from a handful of FAQs, so the smallest model is enough.
    support: "claude-haiku-5-5",
  },
  openai: {
    extraction: "gpt-6.1-terra",
    coach: "gpt-6-luna",
    coachEffort: "medium",
    support: "gpt-6-luna",
  },
} as const;
