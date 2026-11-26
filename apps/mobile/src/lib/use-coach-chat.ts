import type { CoachChatInput, CoachConversationView, CoachMessageView, CoachStreamEvent } from "@fitr8/contracts";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, apiStream, errorMessage } from "@/lib/api";
import { track } from "@/lib/analytics";
import { readConversationId, writeConversationId } from "@/lib/coach-store";
import { openPremium, premiumFeatureOf } from "@/lib/premium";
import { queryClient } from "@/lib/query";

type ToolEvent = Extract<CoachStreamEvent, { type: "tool" }>;
export type ToolStatus = ToolEvent["status"];
/** One tool the coach ran for a reply, with how it went. */
export type ToolChip = { id: string; label: string; status: ToolStatus };
export type CoachMessage = {
  id: string;
  role: CoachMessageView["role"];
  text: string;
  tools: ToolChip[];
  streaming?: boolean;
  /** The reply stopped before the coach finished (user stop, dropped connection, server error). */
  cut?: boolean;
};
/** Why the last message didn't get a full reply: today's chat limit, or anything else. */
export type CoachProblem = { kind: "limit" | "error"; message: string };

export const COACH_MAX_LENGTH = 2000; // CoachChatSchema

const fromView = (m: CoachMessageView): CoachMessage => ({
  id: m.id,
  role: m.role,
  text: m.text,
  tools: m.actions.map((label, i) => ({ id: `${m.id}-${i}`, label, status: "done" })),
});

function upsertTool(tools: ToolChip[], e: ToolEvent): ToolChip[] {
  const next = { id: e.id, label: e.label, status: e.status };
  return tools.some((t) => t.id === e.id) ? tools.map((t) => (t.id === e.id ? next : t)) : [...tools, next];
}

/**
 * The coach conversation: reopens the last thread, streams replies over SSE (text and tool chips),
 * and keeps the draft. When `locked` (free plan), sending keeps the draft and opens Premium.
 * `/coach?ask=…` opens with that question in the composer (not sent), e.g. the Meals suggestion card.
 * Leaving the screen stops the reply (the server aborts the model stream on disconnect).
 */
export function useCoachChat({ locked }: { locked: boolean }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [reloads, setReloads] = useState(0);
  const { ask } = useLocalSearchParams<{ ask?: string }>();
  const [draft, setDraft] = useState(() => (typeof ask === "string" ? ask.slice(0, COACH_MAX_LENGTH) : ""));
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<CoachProblem | null>(null);
  const streamRef = useRef<AbortController | null>(null);

  // Reopen the last thread, if there is one.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      const id = await readConversationId();
      if (ctrl.signal.aborted) return;
      if (!id) {
        setStatus("ready");
        return;
      }
      try {
        const view = await api<CoachConversationView>(`/api/coach/conversations/${encodeURIComponent(id)}`, {
          signal: ctrl.signal,
        });
        setConversationId(view.id);
        setMessages(view.messages.map(fromView));
        setStatus("ready");
      } catch (error) {
        if (ctrl.signal.aborted) return;
        if (error instanceof ApiError && error.status === 404) {
          // Deleted or from another account: start fresh.
          await writeConversationId(null);
          setStatus("ready");
          return;
        }
        setLoadError(errorMessage(error, "Couldn't open your chat."));
        setStatus("error");
      }
    })();
    return () => ctrl.abort();
  }, [reloads]);

  // Leaving the screen stops the reply (the server aborts the model stream on disconnect).
  useEffect(() => {
    const stream = streamRef;
    return () => stream.current?.abort();
  }, []);

  async function send(raw: string) {
    const message = raw.trim().slice(0, COACH_MAX_LENGTH);
    if (!message || sending) return;
    // Free plan: the coach is Premium. Keep what they typed for after buying.
    if (locked) {
      setDraft(message);
      return openPremium("coach");
    }
    const stamp = Date.now();
    const replyId = `reply-${stamp}`;
    const userId = `me-${stamp}`;
    const patch = (fn: (m: CoachMessage) => CoachMessage) =>
      setMessages((all) => all.map((m) => (m.id === replyId ? fn(m) : m)));

    setProblem(null);
    setDraft("");
    setSending(true);
    setMessages((all) => [
      ...all,
      { id: userId, role: "user", text: message, tools: [] },
      { id: replyId, role: "assistant", text: "", tools: [], streaming: true },
    ]);

    const ctrl = new AbortController();
    streamRef.current = ctrl;
    let gotReply = false;
    let usedTools = false;
    let serverError: string | null = null;
    let dropped = false;
    try {
      const body: CoachChatInput = { conversationId: conversationId ?? undefined, message };
      track("coach_message", {});
      await apiStream<CoachStreamEvent>("/api/coach/chat", {
        json: body,
        signal: ctrl.signal,
        onEvent: (e) => {
          switch (e.type) {
            case "conversation":
              setConversationId(e.conversationId);
              writeConversationId(e.conversationId);
              break;
            case "text":
              gotReply = true;
              patch((m) => ({ ...m, text: m.text + e.delta }));
              break;
            case "tool":
              gotReply = true;
              if (e.status === "done") usedTools = true;
              patch((m) => ({ ...m, tools: upsertTool(m.tools, e) }));
              break;
            case "done":
              patch((m) => ({ ...m, streaming: false }));
              break;
            case "error":
              serverError = e.message;
              break;
          }
        },
      });
      if (serverError) setProblem({ kind: "error", message: serverError });
    } catch (error) {
      const premiumFeature = premiumFeatureOf(error);
      if (premiumFeature) {
        setMessages((all) => all.filter((m) => m.id !== replyId && m.id !== userId));
        setDraft(message);
        openPremium(premiumFeature);
      } else if (!ctrl.signal.aborted) {
        dropped = true;
        const limit = error instanceof ApiError && error.status === 429;
        setProblem({
          kind: limit ? "limit" : "error",
          message: errorMessage(error, "Something went wrong. Try again."),
        });
        if (!gotReply) {
          // Nothing came back: take the message out of the thread and give it back to edit or resend.
          setMessages((all) => all.filter((m) => m.id !== replyId && m.id !== userId));
          setDraft(message);
        }
      }
    } finally {
      if (streamRef.current === ctrl) streamRef.current = null;
      const stopped = ctrl.signal.aborted || dropped || serverError !== null;
      setMessages((all) =>
        all
          .filter((m) => !(m.id === replyId && !m.text && m.tools.length === 0))
          .map((m) =>
            m.id === replyId
              ? {
                  ...m,
                  cut: m.streaming && stopped ? true : m.cut,
                  streaming: false,
                  tools: m.tools.map((t) => (t.status === "running" ? { ...t, status: "error" } : t)),
                }
              : m,
          ),
      );
      setSending(false);
      // The coach may have logged water or a weigh-in: refresh Today and Progress.
      if (usedTools) queryClient.invalidateQueries();
    }
  }

  /** Stops the reply being streamed; what arrived so far stays, marked as cut. */
  function stop() {
    streamRef.current?.abort();
  }

  function newChat() {
    streamRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setProblem(null);
    setDraft("");
    setStatus("ready");
    writeConversationId(null);
  }

  return {
    conversationId,
    messages,
    status,
    loadError,
    reload: () => setReloads((n) => n + 1),
    draft,
    setDraft,
    sending,
    problem,
    send,
    stop,
    newChat,
  };
}
