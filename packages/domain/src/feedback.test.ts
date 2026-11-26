import { describe, expect, it } from "vitest";
import { feedbackCan } from "./feedback.js";

describe("feedbackCan", () => {
  it("lets only admins read feedback", () => {
    expect(feedbackCan("ADMIN", "read")).toBe(true);
    expect(feedbackCan("EDITOR", "read")).toBe(false);
    expect(feedbackCan("AUTHOR", "read")).toBe(false);
  });
});
