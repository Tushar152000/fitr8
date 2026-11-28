import { CONTACT_MESSAGE_MAX, SUPPORT_HISTORY_MAX, SUPPORT_MESSAGE_MAX } from "@fitr8/contracts";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  /** False when the bot had no answer: the widget then offers to send the question to the team. */
  answered?: boolean;
  /** Real FAQ questions to offer as tap-to-ask chips under this answer. */
  suggestions?: string[];
}

/** What the empty chat suggests; each is answered by the FAQ. */
export const SUGGESTIONS = [
  "Is FITR8 free?",
  "How much is Premium?",
  "How does food scanning work?",
  "Is my data private?",
] as const;

export const WELCOME =
  "Hi! I’m the FITR8 help assistant. Ask me how FITR8 works, about Premium, your data or your account.";

/** The turns sent with a question: the last few, without the failed or unanswered bot lines. */
export function toHistory(messages: ChatMessage[]): { role: "user" | "assistant"; text: string }[] {
  return messages
    .filter((m) => m.role === "user" || m.answered !== false)
    .slice(-SUPPORT_HISTORY_MAX)
    .map((m) => ({ role: m.role, text: m.text.slice(0, 1500) }));
}

/** The question as it will be sent: trimmed and cut to the API's limit. */
export function cleanQuestion(raw: string): string {
  return raw.trim().slice(0, SUPPORT_MESSAGE_MAX);
}

/** The contact page with the visitor's question already in the message box. */
export function contactHref(question: string): string {
  const message = `Question from the FITR8 help chat: ${question}`.slice(0, CONTACT_MESSAGE_MAX);
  return `/contact?${new URLSearchParams({ message }).toString()}`;
}

export type Segment = { text: string; href?: string; external?: boolean };

/** Pages the bot's answers name, as plain words. */
const PAGES: [RegExp, string][] = [
  [/Privacy Policy/, "/privacy"],
  [/Terms of Service|Terms and Conditions/, "/terms"],
  [/Contact page|contact form/i, "/contact"],
];

const LINKABLE = new RegExp(
  `(https?://[^\\s)]+|[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+|${PAGES.map(([r]) => r.source).join("|")})`,
  "gi",
);

/** Splits an answer into text and links (emails, web addresses, and the Privacy / Terms / Contact pages). */
export function linkify(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(LINKABLE)) {
    const hit = m[0].replace(/[.,;:!?]+$/, "");
    const start = m.index ?? 0;
    if (start > last) out.push({ text: text.slice(last, start) });
    if (/^https?:/.test(hit)) out.push({ text: hit, href: hit, external: true });
    else if (hit.includes("@")) out.push({ text: hit, href: `mailto:${hit}`, external: true });
    else {
      const page = PAGES.find(([r]) => new RegExp(r.source, "i").test(hit));
      out.push(page ? { text: hit, href: page[1] } : { text: hit });
    }
    last = start + hit.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out.length ? out : [{ text }];
}

const STORAGE_KEY = "fitr8-support-chat";

/** The chat saved earlier in this tab (survives page changes and refreshes), or empty. */
export function loadChat(): { messages: ChatMessage[]; open: boolean } {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as {
      messages?: ChatMessage[];
      open?: boolean;
    } | null;
    const messages = (raw?.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
      .slice(-30);
    return { messages, open: Boolean(raw?.open) };
  } catch {
    return { messages: [], open: false };
  }
}

export function saveChat(state: { messages: ChatMessage[]; open: boolean }): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ messages: state.messages.slice(-30), open: state.open }),
    );
  } catch {
    // Private mode or storage blocked: the chat simply doesn't persist.
  }
}
