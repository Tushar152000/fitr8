import { describe, expect, it } from "vitest";
import { buildVocabulary, correctText, correctWord, editDistance } from "./typos.js";

const vocab = buildVocabulary([
  "Does FITR8 work on Android and iPhone?",
  "Cancel your subscription in the store settings",
  "name",
]);

describe("typo tolerance", () => {
  it("counts a swapped pair of letters as one edit", () => {
    expect(editDistance("adnroid", "android")).toBe(1);
    expect(editDistance("subscripton", "subscription")).toBe(1);
  });

  it("fixes a misspelt long word to the FAQ's word", () => {
    expect(correctWord("adnroid", vocab)).toBe("android");
    expect(correctText("is it on adnroid", vocab)).toBe("is it on android");
    expect(correctWord("subscripton", vocab)).toBe("subscription");
  });

  it("leaves known words, short words and unrelated words alone", () => {
    expect(correctWord("android", vocab)).toBe("android");
    expect(correctWord("same", vocab)).toBe("same");
    expect(correctWord("flurbozibble", vocab)).toBe("flurbozibble");
  });
});
