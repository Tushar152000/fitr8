import { useQuery } from "@tanstack/react-query";
import { billingQuery, dayQuery, trainingWeekQuery, waterQuery } from "./queries";

/**
 * "Try asking" for the coach built from today (2026-11-28: the same five questions for everyone,
 * all day). Uses data the app already has — today's meals and targets, water, the training week —
 * and the time of day. Falls back to general questions; at most five, no duplicates.
 */
export function useCoachSuggestions(): string[] {
  const day = useQuery(dayQuery).data;
  const water = useQuery(waterQuery).data;
  const billing = useQuery(billingQuery).data;
  // The training week is only asked for where it's available (any plan has the preview now).
  const week = useQuery({ ...trainingWeekQuery(null), retry: false, enabled: billing != null }).data;
  const hour = new Date().getHours();
  const out: string[] = [];

  const target = day?.target;
  if (target && day) {
    const proteinLeft = Math.round(target.proteinG - day.eaten.proteinG);
    const kcalLeft = Math.round(target.kcal - day.eaten.kcal);
    if (proteinLeft >= 20) out.push(`I'm ${proteinLeft} g short on protein today. What can I eat?`);
    if (hour >= 17 && kcalLeft > 250)
      out.push(`What's a good dinner for about ${Math.round(kcalLeft / 50) * 50} kcal?`);
    else if (hour < 11 && day.meals.length === 0) out.push("What's a good high-protein breakfast?");
    if (kcalLeft < 0) out.push("I went over today. What should I do tomorrow?");
  }

  if (water && water.consumedMl < water.targetMl * 0.5 && hour >= 14)
    out.push("How can I drink more water through the day?");

  const today = week?.days.find((d) => d.date === week.today);
  if (today && today.type !== "rest" && today.status === "today")
    out.push(`Any tips for today's ${today.title.toLowerCase()}?`);
  else if (today?.type === "rest") out.push("What should I do on a rest day?");

  for (const general of [
    "Why is my calorie target what it is?",
    "How many sets a week to build muscle?",
    "Help me start running",
  ]) {
    if (out.length >= 5) break;
    out.push(general);
  }
  return [...new Set(out)].slice(0, 5);
}
