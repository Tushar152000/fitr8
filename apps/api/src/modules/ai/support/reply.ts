import { FOLLOW_UPS, NO_ANSWER } from "./prompt.js";
import type { SupportModelReply } from "./types.js";

/** Reads the model's text: `NO_ANSWER`, or an answer with an optional last `FOLLOW_UPS: a | b | c` line. */
export function parseSupportReply(text: string): SupportModelReply {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith(NO_ANSWER))
    return { reply: "", followUps: [], noAnswer: true };

  const lines = trimmed.split("\n");
  const at = lines.findLastIndex((l) => l.trim().startsWith(FOLLOW_UPS));
  if (at === -1) return { reply: trimmed, followUps: [], noAnswer: false };

  const followUps = lines[at]!.trim()
    .slice(FOLLOW_UPS.length)
    .split("|")
    .map((q) => q.trim())
    .filter(Boolean);
  const reply = lines
    .filter((_, i) => i !== at)
    .join("\n")
    .trim();
  return reply
    ? { reply, followUps, noAnswer: false }
    : { reply: "", followUps: [], noAnswer: true };
}
