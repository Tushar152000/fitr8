import type OpenAI from "openai";
import { SUPPORT_SYSTEM_PROMPT, supportKnowledgeBlock, supportVisitorPrompt } from "./prompt.js";
import { parseSupportReply } from "./reply.js";
import type { SupportAnswerer, SupportFact, SupportTurn } from "./types.js";

export class OpenAiSupportAnswerer implements SupportAnswerer {
  readonly name = "openai";
  readonly grounding = "all" as const;

  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async answer({
    knowledge,
    history,
    message,
  }: {
    knowledge: SupportFact[];
    matches: SupportFact[];
    history: SupportTurn[];
    message: string;
  }) {
    const started = Date.now();
    const res = await this.client.responses.create({
      model: this.model,
      max_output_tokens: 1_500,
      store: false,
      reasoning: { effort: "low" },
      // Same prefix for every visitor, so OpenAI's automatic prompt caching applies.
      instructions: `${SUPPORT_SYSTEM_PROMPT}\n\n${supportKnowledgeBlock(knowledge)}`,
      input: [
        ...history.map((t) => ({ role: t.role, content: t.text })),
        { role: "user" as const, content: supportVisitorPrompt(message) },
      ],
    });
    if (res.incomplete_details?.reason === "content_filter")
      throw new Error("The model declined to answer");
    return {
      data: parseSupportReply(res.output_text),
      usage: {
        provider: this.name,
        model: res.model,
        tokensIn: res.usage?.input_tokens,
        tokensOut: res.usage?.output_tokens,
        latencyMs: Date.now() - started,
      },
    };
  }
}
