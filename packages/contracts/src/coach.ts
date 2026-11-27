import { z } from "zod";

/** POST /api/coach/chat — one user turn. Omit conversationId to start a new conversation. */
export const CoachChatSchema = z.object({
  conversationId: z.string().min(1).max(64).optional(),
  message: z.string().trim().min(1).max(2000),
});
export type CoachChatInput = z.infer<typeof CoachChatSchema>;

/**
 * Server-sent events streamed back by POST /api/coach/chat (`text/event-stream`, one JSON object per `data:` line).
 * Clients render `text` deltas as they arrive and show `tool` events as small status chips.
 */
/**
 * Something a tool made that the app shows as a card in the chat (2026-11-28). `meal_draft`: the
 * meal `draft_meal` prepared (not logged yet) with "Review & log" → the meal's review screen.
 * `status` PENDING / ANALYZING means it's still being read (items arrive on the review screen).
 */
export interface CoachMealDraftCard {
  kind: "meal_draft";
  mealId: string;
  mealType: string;
  status: string;
  kcal: number | null;
  items: { name: string; kcal: number | null }[];
}
export type CoachCard = CoachMealDraftCard;

export type CoachStreamEvent =
  | { type: "conversation"; conversationId: string }
  | { type: "text"; delta: string }
  | {
      type: "tool";
      id: string;
      name: string;
      label: string;
      status: "running" | "done" | "error";
      /** On "done", when the tool made something to show (see CoachCard). */
      card?: CoachCard;
    }
  | { type: "done"; messageId: string }
  | { type: "error"; message: string };

/** A message as shown in the chat UI (tool plumbing and thinking are stripped). */
export interface CoachMessageView {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Labels of the tools the coach used for this reply, e.g. "Checked today's meals". */
  actions: string[];
  createdAt: string;
}

export interface CoachConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface CoachConversationView extends CoachConversationSummary {
  messages: CoachMessageView[];
}

/** GET /api/coach/memories — a lasting fact the coach keeps about the user (DELETE /api/coach/memories/:id). */
export interface CoachMemoryView {
  id: string;
  text: string;
  createdAt: string;
}
