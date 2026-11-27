import { describe, expect, it } from "vitest";
import { setupDefaults } from "./setup-defaults.js";

const base = {
  trainingDaysPerWeek: 4,
  sessionMinutes: 45,
  equipment: "FULL_GYM",
  goal: "MUSCLE_GAIN",
} as const;

describe("setupDefaults", () => {
  it("keeps onboarding values that are already setup choices", () => {
    expect(setupDefaults(base)).toEqual({ types: ["gym"], daysPerWeek: 4, sessionMinutes: 45 });
  });

  it("clamps days to 3–6", () => {
    expect(setupDefaults({ ...base, trainingDaysPerWeek: 2 }).daysPerWeek).toBe(3);
    expect(setupDefaults({ ...base, trainingDaysPerWeek: 6 }).daysPerWeek).toBe(6);
    expect(setupDefaults({ ...base, trainingDaysPerWeek: 9 }).daysPerWeek).toBe(6);
  });

  it("snaps minutes to the nearest of 30 / 45 / 60, ties to the shorter", () => {
    expect(setupDefaults({ ...base, sessionMinutes: 15 }).sessionMinutes).toBe(30);
    expect(setupDefaults({ ...base, sessionMinutes: 37 }).sessionMinutes).toBe(30);
    expect(setupDefaults({ ...base, sessionMinutes: 38 }).sessionMinutes).toBe(45);
    expect(setupDefaults({ ...base, sessionMinutes: 52 }).sessionMinutes).toBe(45);
    expect(setupDefaults({ ...base, sessionMinutes: 53 }).sessionMinutes).toBe(60);
    expect(setupDefaults({ ...base, sessionMinutes: 120 }).sessionMinutes).toBe(60);
  });

  it("picks gym for a full gym, else a home plan", () => {
    expect(setupDefaults({ ...base, equipment: "DUMBBELLS" }).types).toEqual(["home"]);
    expect(setupDefaults({ ...base, equipment: "BODYWEIGHT" }).types).toEqual(["home"]);
  });

  it("adds walking for fat loss", () => {
    expect(setupDefaults({ ...base, goal: "FAT_LOSS" }).types).toEqual(["gym", "walk"]);
    expect(setupDefaults({ ...base, goal: "RECOMPOSITION" }).types).toEqual(["gym"]);
  });
});
