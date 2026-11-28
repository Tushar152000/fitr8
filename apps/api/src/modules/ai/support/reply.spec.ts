import { describe, expect, it } from "vitest";
import { parseSupportReply } from "./reply.js";

describe("parseSupportReply", () => {
  it("reads NO_ANSWER, empty text and an answer that is only follow-ups as no answer", () => {
    expect(parseSupportReply("NO_ANSWER").noAnswer).toBe(true);
    expect(parseSupportReply("  NO_ANSWER\n").noAnswer).toBe(true);
    expect(parseSupportReply("").noAnswer).toBe(true);
    expect(parseSupportReply("FOLLOW_UPS: Is FITR8 free?").noAnswer).toBe(true);
  });

  it("splits the answer from its follow-up line", () => {
    expect(
      parseSupportReply(
        "Yes, you can start free.\nFOLLOW_UPS: What does Premium add? | How do I cancel?",
      ),
    ).toEqual({
      reply: "Yes, you can start free.",
      followUps: ["What does Premium add?", "How do I cancel?"],
      noAnswer: false,
    });
  });

  it("keeps a plain answer without follow-ups", () => {
    expect(
      parseSupportReply("Premium is ₹149 a month.\n\nThe store shows the final price."),
    ).toEqual({
      reply: "Premium is ₹149 a month.\n\nThe store shows the final price.",
      followUps: [],
      noAnswer: false,
    });
  });
});
