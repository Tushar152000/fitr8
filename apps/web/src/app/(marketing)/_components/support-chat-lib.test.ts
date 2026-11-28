import { describe, expect, it } from "vitest";
import {
  cleanQuestion,
  contactHref,
  linkify,
  toHistory,
  type ChatMessage,
} from "./support-chat-lib";

describe("support chat helpers", () => {
  it("sends only the last six turns", () => {
    const messages: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      text: `m${i}`,
    }));
    const history = toHistory(messages);
    expect(history).toHaveLength(6);
    expect(history[0]!.text).toBe("m4");
  });

  it("leaves out bot lines that had no answer", () => {
    const history = toHistory([
      { role: "user", text: "flurbo" },
      { role: "assistant", text: "I’m not sure", answered: false },
      { role: "user", text: "Is it free?" },
    ]);
    expect(history.map((h) => h.text)).toEqual(["flurbo", "Is it free?"]);
  });

  it("trims a question and cuts it to the API limit", () => {
    expect(cleanQuestion("  hello  ")).toBe("hello");
    expect(cleanQuestion("x".repeat(900))).toHaveLength(500);
  });

  it("builds a contact link with the question prefilled", () => {
    const href = contactHref("How do I get a refund?");
    expect(href.startsWith("/contact?message=")).toBe(true);
    expect(new URLSearchParams(href.split("?")[1]).get("message")).toBe(
      "Question from the FITR8 help chat: How do I get a refund?",
    );
  });
});

describe("linkify", () => {
  it("links the Privacy Policy, emails and web addresses, leaving the rest as text", () => {
    expect(
      linkify("See the Privacy Policy, or email askfitr8@gmail.com. Visit https://fitr8.com."),
    ).toEqual([
      { text: "See the " },
      { text: "Privacy Policy", href: "/privacy" },
      { text: ", or email " },
      { text: "askfitr8@gmail.com", href: "mailto:askfitr8@gmail.com", external: true },
      { text: ". Visit " },
      { text: "https://fitr8.com", href: "https://fitr8.com", external: true },
      { text: "." },
    ]);
  });

  it("returns plain text as one segment", () => {
    expect(linkify("Yes, you can start free.")).toEqual([{ text: "Yes, you can start free." }]);
  });
});
