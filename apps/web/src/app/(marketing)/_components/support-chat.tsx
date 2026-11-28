"use client";

import { Loader2, RotateCcw, SendHorizontal, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import type { SupportChatReply } from "@fitr8/contracts";
import { CONTACT_EMAIL } from "./contact";
import {
  SUGGESTIONS,
  WELCOME,
  cleanQuestion,
  contactHref,
  linkify,
  loadChat,
  saveChat,
  toHistory,
  type ChatMessage,
} from "./support-chat-lib";

const chip =
  "rounded-full border border-fitr8/30 bg-white px-3 py-1.5 text-left text-[13px] font-medium text-fitr8 hover:bg-fitr8-lilac-soft focus-visible:outline-2 focus-visible:outline-fitr8";

/**
 * "Ask FITR8": the help chat on every marketing page. A visitor asks, POST /api/support/chat
 * answers from the FAQ in one plain reply (no sign-in, nothing stored on the server). The chat is
 * kept in this tab's sessionStorage, so it survives page changes and refreshes. Each answer offers
 * follow-up questions as chips; when the bot has no answer, one tap sends the question to the team.
 */
export function SupportChat() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const loaded = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  // Restore this tab's chat once, then keep it saved.
  useEffect(() => {
    const saved = loadChat();
    setMessages(saved.messages);
    setOpen(saved.open);
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (loaded.current) saveChat({ messages, open });
  }, [messages, open]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages, sending, open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  async function ask(raw: string) {
    const question = cleanQuestion(raw);
    if (question.length < 2 || sending) return;
    const history = toHistory(messages);
    setMessages((m) => [...m, { role: "user", text: question }]);
    setDraft("");
    setSending(true);
    try {
      const res = await api<SupportChatReply>("/api/support/chat", {
        method: "POST",
        json: { message: question, history },
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: res.reply,
          answered: res.answered,
          suggestions: res.suggestions,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            err instanceof ApiError && err.status !== 0
              ? err.message
              : `I couldn’t reach FITR8 just now. Please try again, or email us at ${CONTACT_EMAIL}.`,
          answered: false,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const last = messages.at(-1);

  return (
    <>
      {!open && (
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Ask FITR8"
          className="group fixed right-4 bottom-4 z-40 flex flex-col items-center gap-2.5 focus-visible:outline-none sm:right-6 sm:bottom-6"
        >
          {/* The label floats above the icon, like a speech bubble pointing down at it. */}
          <span
            aria-hidden
            className="relative rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-fitr8-ink shadow-hard-sm ring-1 ring-black/10"
          >
            Ask FITR8
            <span className="absolute -bottom-1 left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-white ring-1 ring-black/10 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
          </span>
          {/* A white ring so the icon stands out on the purple sections, and a green "online" dot. */}
          <span className="relative grid size-14 place-items-center rounded-full bg-fitr8 text-white shadow-hard-sm ring-[3px] ring-white transition-transform duration-150 group-hover:-translate-y-0.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-fitr8">
            <Sparkles className="size-6" aria-hidden />
            <span
              aria-hidden
              className="absolute top-0 right-0 size-3.5 rounded-full border-2 border-white bg-[#22c55e]"
            />
          </span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-labelledby={`${id}-title`}
          onKeyDown={(e) => e.key === "Escape" && close()}
          className="fixed right-4 bottom-4 z-40 flex h-[min(560px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-[20px] bg-white shadow-hard ring-1 ring-black/10 sm:right-6 sm:bottom-6"
        >
          <header className="flex items-center justify-between gap-3 bg-fitr8 px-4 py-3 text-white">
            <div>
              <h2 id={`${id}-title`} className="text-base font-semibold">
                Ask FITR8
              </h2>
              <p className="text-[12px] text-white/80">Quick answers about the app</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  aria-label="Start a new chat"
                  className="grid size-9 place-items-center rounded-full hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <RotateCcw className="size-[18px]" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Close chat"
                className="grid size-9 place-items-center rounded-full hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          </header>

          <div
            role="log"
            aria-live="polite"
            className="flex flex-1 flex-col gap-3 overflow-y-auto bg-fitr8-soft px-4 py-4 text-[15px]"
          >
            <Bubble role="assistant">{WELCOME}</Bubble>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} className={chip}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Bubble role={m.role}>{m.text}</Bubble>
                {m.answered === false && (
                  <Link
                    href={contactHref(
                      messages.slice(0, i).findLast((x) => x.role === "user")?.text ?? "",
                    )}
                    className="self-start rounded-full bg-fitr8 px-4 py-2 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fitr8"
                  >
                    Talk to the team
                  </Link>
                )}
                {m === last && !sending && m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.suggestions.map((s) => (
                      <button key={s} type="button" onClick={() => ask(s)} className={chip}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <Bubble role="assistant">
                <span className="inline-flex items-center gap-2 text-ink-3">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Looking that up…
                </span>
              </Bubble>
            )}
            <div ref={end} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(draft);
            }}
            className="border-t border-line bg-white p-3"
          >
            <div className="flex items-end gap-2">
              <label htmlFor={`${id}-q`} className="sr-only">
                Your question
              </label>
              <textarea
                id={`${id}-q`}
                ref={input}
                rows={1}
                value={draft}
                maxLength={500}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(draft);
                  }
                }}
                placeholder="Type your question"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-input border border-line-strong bg-surface px-3 py-2.5 text-base outline-none placeholder:text-ink-3/60 focus:border-ink"
              />
              <button
                type="submit"
                disabled={sending || cleanQuestion(draft).length < 2}
                aria-label="Send"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-fitr8 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fitr8 disabled:opacity-40"
              >
                <SendHorizontal className="size-5" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-3">
              General help about FITR8, not medical advice. Don’t share passwords or health details.
            </p>
          </form>
        </section>
      )}
    </>
  );
}

const linkClass = "font-semibold text-fitr8 underline";

/** One chat bubble. The bot's words become links where they name a page, email or web address. */
function Bubble({ role, children }: { role: ChatMessage["role"]; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div
      className={
        mine
          ? "max-w-[85%] self-end rounded-2xl rounded-br-md bg-fitr8 px-3.5 py-2.5 break-words text-white"
          : "max-w-[90%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 break-words whitespace-pre-line text-fitr8-ink shadow-sm"
      }
    >
      {!mine && typeof children === "string"
        ? linkify(children).map((s, i) =>
            !s.href ? (
              s.text
            ) : s.external ? (
              <a
                key={i}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {s.text}
              </a>
            ) : (
              <Link key={i} href={s.href} className={linkClass}>
                {s.text}
              </Link>
            ),
          )
        : children}
    </div>
  );
}
