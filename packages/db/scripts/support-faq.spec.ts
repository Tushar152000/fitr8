import { describe, expect, it } from "vitest";
import { parseSupportFile, parseSupportFiles, slugify } from "./support-faq.js";

const file = (body: string) => `---\nsection: Getting started\n---\n\n${body}`;

describe("support FAQ parser", () => {
  it("reads questions, answers and the optional keywords line", () => {
    const [a, b] = parseSupportFile(
      "start.md",
      file(
        "## How do I sign up?\nTap Start for free on the website.\nKeywords: register, join\n\n## Is it free?\nYes, you can start for free and upgrade later.",
      ),
    );
    expect(a).toEqual({
      slug: "how-do-i-sign-up",
      section: "Getting started",
      question: "How do I sign up?",
      answer: "Tap Start for free on the website.",
      keywords: "register, join",
    });
    expect(b!.keywords).toBe("");
  });

  it("rejects a missing section, a too-short heading, an empty answer and no entries", () => {
    expect(() => parseSupportFile("x.md", "## Q?\nanswer here is long enough")).toThrow(
      /front matter/,
    );
    expect(() => parseSupportFile("x.md", file("## Hi\nanswer long enough here"))).toThrow(
      /too short/,
    );
    expect(() => parseSupportFile("x.md", file("## Is it free?\nYes"))).toThrow(/no answer/);
    expect(() => parseSupportFile("x.md", file("just text"))).toThrow(/no "## Question"/);
  });

  it("rejects a slug used in two files", () => {
    const f = file("## Is it free?\nYes, you can start for free today.");
    expect(() =>
      parseSupportFiles([
        { name: "a.md", text: f },
        { name: "b.md", text: f },
      ]),
    ).toThrow(/duplicate/);
  });

  it("makes short kebab-case slugs", () => {
    expect(slugify("Can I use FITR8 on more than one device?")).toBe(
      "can-i-use-fitr8-on-more-than-one-device",
    );
    expect(slugify("x".repeat(100)).length).toBeLessThanOrEqual(60);
  });
});
