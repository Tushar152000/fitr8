import type { SupportAnswerer, SupportFact } from "./types.js";

/** Dev, test and CI: answers with the best keyword match as written. No key needed. */
export class MockSupportAnswerer implements SupportAnswerer {
  readonly name = "mock";
  readonly grounding = "matches" as const;

  async answer({ matches }: { matches: SupportFact[] }) {
    const top = matches[0];
    return {
      data: { reply: top?.answer ?? "", followUps: [], noAnswer: !top },
      usage: { provider: this.name, model: "mock", latencyMs: 0 },
    };
  }
}
