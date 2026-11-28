import { z } from "zod";

/** Longest question the website support bot accepts, and the most earlier turns it is sent. */
export const SUPPORT_MESSAGE_MAX = 500;
export const SUPPORT_HISTORY_MAX = 6;

/**
 * The website support bot (POST /api/support/chat, no sign-in). `history` is the last few turns of
 * the visitor's open chat, so a follow-up like "and on Android?" makes sense; nothing is stored.
 */
export const SupportChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, "Ask a question so we can help.")
    .max(SUPPORT_MESSAGE_MAX, "Please keep your question a little shorter."),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(1500),
      }),
    )
    .max(SUPPORT_HISTORY_MAX)
    .default([]),
});

/**
 * `answered: false` means the bot had no answer: the widget then offers to send the question to the
 * team. `suggestions` are real FAQ questions the visitor may want next (tap to ask).
 */
export interface SupportChatReply {
  reply: string;
  answered: boolean;
  suggestions: string[];
}

export type SupportChatInput = z.infer<typeof SupportChatSchema>;
