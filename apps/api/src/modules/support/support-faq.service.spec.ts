import { describe, expect, it } from "vitest";
import { normaliseQuestion, supportSearchText } from "./support-faq.service.js";

describe("supportSearchText", () => {
  it("drops filler words that match every FAQ", () => {
    expect(supportSearchText("Can I get a routine in FITR8?")).toBe("routine");
    expect(supportSearchText("how many free photo scans")).toBe("how free photo scans");
  });

  it("returns an empty string when nothing meaningful is left", () => {
    expect(supportSearchText("can you ?")).toBe("");
  });
});

describe("normaliseQuestion", () => {
  it("ignores case, punctuation and spacing so a chip's question matches exactly", () => {
    expect(normaliseQuestion("  How much is Premium? ")).toBe(
      normaliseQuestion("how much is premium"),
    );
    expect(normaliseQuestion("Is FITR8 free?")).not.toBe(normaliseQuestion("Is it free?"));
  });
});
