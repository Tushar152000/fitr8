import type Anthropic from "@anthropic-ai/sdk";
import { SUPPORT_SYSTEM_PROMPT, supportKnowledgeBlock, supportVisitorPrompt } from "./prompt.js";
import { parseSupportReply } from "./reply.js";
import type { SupportAnswerer, SupportFact, SupportTurn } from "./types.js";

export class ClaudeSupportAnswerer implements SupportAnswerer {
  readonly name = "anthropic";
  readonly grounding = "all" as const;

  constructor(
    private readonly client: Anthropic,
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
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 600,
      // Both blocks are identical for every visitor, so they cache across them; the breakpoint on the
      // FAQ block covers the instructions before it too.
      system: [
        { type: "text", text: SUPPORT_SYSTEM_PROMPT },
        {
          type: "text",
          text: supportKnowledgeBlock(knowledge),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        ...history.map((t) => ({ role: t.role, content: t.text })),
        { role: "user" as const, content: supportVisitorPrompt(message) },
      ],
    });
    if (res.stop_reason === "refusal") throw new Error("The model declined to answer");
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return {
      data: parseSupportReply(text),
      usage: {
        provider: this.name,
        model: res.model,
        tokensIn:
          res.usage.input_tokens +
          (res.usage.cache_read_input_tokens ?? 0) +
          (res.usage.cache_creation_input_tokens ?? 0),
        tokensOut: res.usage.output_tokens,
        latencyMs: Date.now() - started,
      },
    };
  }
}
