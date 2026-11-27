import { describe, expect, it } from "vitest";
import { FREE_PREVIEW_EXERCISES, freeSampleDate, previewExercises } from "./free-preview.js";

describe("freeSampleDate", () => {
  it("is the first non-rest day by date", () => {
    expect(
      freeSampleDate([
        { date: "2026-11-24", type: "rest" },
        { date: "2026-11-25", type: "gym" },
        { date: "2026-11-23", type: "rest" },
        { date: "2026-11-26", type: "run" },
      ]),
    ).toBe("2026-11-25");
  });

  it("sorts out-of-order days", () => {
    expect(
      freeSampleDate([
        { date: "2026-11-27", type: "yoga" },
        { date: "2026-11-24", type: "run" },
      ]),
    ).toBe("2026-11-24");
  });

  it("is null for an all-rest or empty week", () => {
    expect(freeSampleDate([{ date: "2026-11-23", type: "rest" }])).toBeNull();
    expect(freeSampleDate([])).toBeNull();
  });
});

describe("previewExercises", () => {
  const list = ["a", "b", "c", "d", "e"];

  it("shows the first FREE_PREVIEW_EXERCISES and counts the rest", () => {
    const r = previewExercises(list, false);
    expect(r.shown).toEqual(list.slice(0, FREE_PREVIEW_EXERCISES));
    expect(r.locked).toBe(list.length - FREE_PREVIEW_EXERCISES);
  });

  it("shows the sample day in full", () => {
    expect(previewExercises(list, true)).toEqual({ shown: list, locked: 0 });
  });

  it("locks nothing when the list is short", () => {
    expect(previewExercises(["a"], false)).toEqual({ shown: ["a"], locked: 0 });
    expect(previewExercises([], false)).toEqual({ shown: [], locked: 0 });
  });

  it("keeps a missing list missing", () => {
    expect(previewExercises(null, false)).toEqual({ shown: null, locked: 0 });
    expect(previewExercises(null, true)).toEqual({ shown: null, locked: 0 });
  });

  it("does not mutate the input", () => {
    const input = ["a", "b", "c"];
    previewExercises(input, true).shown!.push("x");
    expect(input).toEqual(["a", "b", "c"]);
  });
});
