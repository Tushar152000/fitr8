import type { CoachChatInput, CoachConversationView, CoachMessageView, CoachStreamEvent } from "@fitr8/contracts";
import {
  ArrowUp,
  ArrowUpRight,
  Brain,
  Check,
  ChevronLeft,
  Crown,
  CircleAlert,
  History,
  Info,
  LoaderCircle,
  RotateCw,
  Sparkles,
  Square,
  SquarePen,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Sheet } from "@/components/sheet";
import { Line } from "@/components/skeletons";
import { Button, Card, FieldError, Text } from "@/components/ui";
import { api, ApiError, apiStream } from "@/lib/api";
import { track } from "@/lib/analytics";
import { readConversationId, writeConversationId } from "@/lib/coach-store";
import { openPremium, premiumFeatureOf, usePremium } from "@/lib/premium";
import { queryClient } from "@/lib/query";
import { COACH_HERO, OLIVE_BUTTON } from "@/lib/gradients";
import { fonts, gutter, makeStyles, radius, useColors } from "@/lib/theme";
import { PremiumBadge } from "@/components/premium-badge";

type ToolStatus = Extract<CoachStreamEvent, { type: "tool" }>["status"];
type ToolChip = { id: string; label: string; status: ToolStatus };
type Message = {
  id: string;
  role: CoachMessageView["role"];
  text: string;
  tools: ToolChip[];
  streaming?: boolean;
  /** The reply stopped before the coach finished (user stop, dropped connection, server error). */
  cut?: boolean;
};
type Problem = { kind: "limit" | "error"; message: string };

const MAX_LENGTH = 2000; // CoachChatSchema
const SUGGESTIONS = [
  "How am I doing on protein today?",
  "What should I eat for dinner?",
  "How many sets a week to build muscle?",
  "Help me start running",
  "Why is my calorie target what it is?",
];

const fromView = (m: CoachMessageView): Message => ({
  id: m.id,
  role: m.role,
  text: m.text,
  tools: m.actions.map((label, i) => ({ id: `${m.id}-${i}`, label, status: "done" })),
});

function upsertTool(tools: ToolChip[], e: Extract<CoachStreamEvent, { type: "tool" }>): ToolChip[] {
  const next = { id: e.id, label: e.label, status: e.status };
  return tools.some((t) => t.id === e.id) ? tools.map((t) => (t.id === e.id ? next : t)) : [...tools, next];
}

/** Chat with the FITR8 coach. Replies stream in; the thread is kept so reopening continues it. */
export default function CoachScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { locked, isPremium } = usePremium();
  const coachLocked = locked("coach");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [reloads, setReloads] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [menu, setMenu] = useState(false);
  const streamRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView>(null);

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
        setLoadError(error instanceof Error ? error.message : "Couldn't open your chat.");
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
    const message = raw.trim().slice(0, MAX_LENGTH);
    if (!message || sending) return;
    // Free plan: the coach is Premium. Keep what they typed for after buying.
    if (coachLocked) {
      setDraft(message);
      return openPremium("coach");
    }
    const stamp = Date.now();
    const replyId = `reply-${stamp}`;
    const userId = `me-${stamp}`;
    const patch = (fn: (m: Message) => Message) => setMessages((all) => all.map((m) => (m.id === replyId ? fn(m) : m)));

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
          message: error instanceof Error ? error.message : "Something went wrong. Try again.",
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

  function newChat() {
    streamRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setProblem(null);
    setDraft("");
    setStatus("ready");
    writeConversationId(null);
  }

  const canSend = draft.trim().length > 0 && !sending && status === "ready";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.ground }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={({ pressed }) => [styles.round, pressed && { backgroundColor: c.sunken }]}
        >
          <ChevronLeft size={22} color={c.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text weight={500} size={12} color={c.ink3}>
            Food, training, running &amp; recovery
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="h2" size={22}>
              Your coach
            </Text>
            {isPremium && <PremiumBadge />}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chats and memory"
          onPress={() => setMenu(true)}
          style={({ pressed }) => [styles.round, pressed && { backgroundColor: c.sunken }]}
        >
          <History size={20} color={c.ink} />
        </Pressable>
      </View>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Your coach">
        <View style={{ gap: 8, paddingBottom: 8 }}>
          {(messages.length > 0 || conversationId) && (
            <MenuRow
              icon={SquarePen}
              label="New chat"
              hint="Start fresh. Your coach still remembers what you told it."
              onPress={() => {
                setMenu(false);
                newChat();
              }}
            />
          )}
          <MenuRow
            icon={Brain}
            label="What your coach remembers"
            hint="See or delete the things it keeps in mind."
            onPress={() => {
              setMenu(false);
              router.push("/coach-memory");
            }}
          />
        </View>
      </Sheet>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        // Follow the conversation as replies stream in; the intro stays at the top.
        onContentSizeChange={() => {
          if (messages.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
        }}
        contentContainerStyle={styles.thread}
      >
        {status === "loading" ? (
          <ThreadSkeleton />
        ) : status === "error" ? (
          <Card>
            <FieldError>{loadError}</FieldError>
            <Button variant="secondary" icon={RotateCw} onPress={() => setReloads((n) => n + 1)}>
              Try again
            </Button>
          </Card>
        ) : messages.length === 0 ? (
          <Intro onPick={send} locked={coachLocked} />
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}

        {problem && (
          <View accessibilityLiveRegion="polite">
            {problem.kind === "limit" ? (
              <Card>
                <Text weight={600}>That&apos;s today&apos;s coach chats used up</Text>
                <Text size={13} color={c.ink2}>
                  {problem.message} Logging meals, water and workouts still works as usual.
                </Text>
              </Card>
            ) : (
              <FieldError>{problem.message}</FieldError>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <TextInput
          accessibilityLabel="Message your coach"
          value={draft}
          onChangeText={setDraft}
          editable={status === "ready"}
          multiline
          maxLength={MAX_LENGTH}
          placeholder="Ask your coach..."
          numberOfLines={1}
          placeholderTextColor={c.ink3}
          style={styles.input}
          textAlignVertical="center"
        />
        {sending ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop the reply"
            onPress={() => streamRef.current?.abort()}
            style={styles.send}
          >
            <LinearGradient {...OLIVE_BUTTON} style={styles.sendFill}>
              <Square size={16} color="#ffffff" fill="#ffffff" />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={() => send(draft)}
            style={({ pressed }) => [styles.send, pressed && canSend && { transform: [{ scale: 0.96 }] }]}
          >
            <LinearGradient {...OLIVE_BUTTON} style={styles.sendFill}>
              <ArrowUp size={22} color="#ffffff" strokeWidth={2.2} />
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Intro({ onPick, locked }: { onPick: (text: string) => void; locked: boolean }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ gap: 18 }}>
      {locked && (
        <Card dark style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Crown size={18} color={c.brandGlow} />
            <Text size={12} weight={700} color={c.brandGlow}>
              PREMIUM
            </Text>
          </View>
          <Text variant="h2" color={c.white}>
            Your coach is part of Premium
          </Text>
          <Text color="rgba(255,255,255,0.78)">
            Try it free for 7 days: answers made for your goal, meals and training, backed by sports science.
          </Text>
          <Button icon={Crown} onPress={() => openPremium("coach")}>
            Unlock the AI Coach
          </Button>
        </Card>
      )}

      <LinearGradient {...COACH_HERO} style={styles.hero}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={styles.heroIcon}>
            <Sparkles size={18} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text weight={700} size={16} color="#ffffff">
              Your fitness &amp; nutrition coach
            </Text>
            <Text size={12} color="rgba(255,255,255,0.65)">
              Online · knows your plan
            </Text>
          </View>
        </View>
        <Text size={14} color="rgba(255,255,255,0.82)" style={{ lineHeight: 21 }}>
          I know your goal, targets, meals, workouts and weight, and I remember what you tell me, like injuries or foods
          you avoid. I can also log water or a weigh-in for you.
        </Text>
        <View style={styles.heroChips}>
          {["Remembers you", "Science-based", "Logs for you"].map((t) => (
            <View key={t} style={styles.heroChip}>
              <Text weight={600} size={11} color="#ffffff">
                {t}
              </Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ gap: 10 }}>
        <Text weight={500} size={12} color={c.ink3}>
          Try asking
        </Text>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            onPress={() => onPick(s)}
            style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: c.sunken }]}
          >
            <Text weight={500} size={15}>
              {s}
            </Text>
            <ArrowUpRight size={16} color={c.ink3} />
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Info size={14} color={c.ink3} style={{ marginTop: 2 }} />
        <Text size={12} color={c.ink3} style={{ flex: 1, lineHeight: 17 }}>
          General guidance, not medical advice. If you&apos;re injured, pregnant, have a medical condition or take
          medication, check with your doctor or physio.
        </Text>
      </View>
    </View>
  );
}

function MenuRow({
  icon: Icon,
  label,
  hint,
  onPress,
}: {
  icon: typeof Brain;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: c.sunken }]}
    >
      <Icon size={20} color={c.ink} />
      <View style={{ flex: 1 }}>
        <Text weight={600}>{label}</Text>
        <Text size={13} color={c.ink3}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

function Bubble({ message: m }: { message: Message }) {
  const c = useColors();
  const styles = useStyles();
  if (m.role === "user") {
    return (
      <View style={[styles.bubble, styles.mine]}>
        <Text color={c.onStrong}>{m.text}</Text>
      </View>
    );
  }
  const thinking = m.streaming && !m.text && m.tools.every((t) => t.status !== "running");
  return (
    <View style={{ gap: 8, alignSelf: "stretch" }}>
      {m.tools.length > 0 && (
        <View style={styles.tools}>
          {m.tools.map((t) => (
            <ToolStatusChip key={t.id} tool={t} />
          ))}
        </View>
      )}
      {(m.text || thinking) && (
        <View style={[styles.bubble, styles.theirs]} accessibilityLiveRegion={m.streaming ? "polite" : "none"}>
          {m.text ? <Text>{m.text}</Text> : <Text color={c.ink3}>Thinking…</Text>}
        </View>
      )}
      {m.cut && <Text variant="meta">Reply stopped before it finished.</Text>}
    </View>
  );
}

function ToolStatusChip({ tool }: { tool: ToolChip }) {
  const c = useColors();
  const styles = useStyles();
  const Icon = tool.status === "running" ? LoaderCircle : tool.status === "done" ? Check : CircleAlert;
  const tint = tool.status === "done" ? c.protein : tool.status === "error" ? c.caution : c.ink3;
  return (
    <View style={styles.tool} accessibilityLabel={`${tool.label}${tool.status === "running" ? ", working" : ""}`}>
      <Icon size={14} color={tint} strokeWidth={2} />
      <Text weight={600} size={12} color={c.ink2}>
        {tool.label}
      </Text>
    </View>
  );
}

function ThreadSkeleton() {
  const styles = useStyles();
  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.bubble, styles.theirs, { gap: 8 }]}>
        <Line tone="card" width="90%" />
        <Line tone="card" width="70%" />
      </View>
      <View style={{ alignSelf: "flex-end", width: "60%" }}>
        <Line height={40} />
      </View>
      <View style={[styles.bubble, styles.theirs, { gap: 8 }]}>
        <Line tone="card" width="80%" />
        <Line tone="card" width="95%" />
        <Line tone="card" width="40%" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: gutter,
    paddingBottom: 8,
    backgroundColor: c.ground,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { borderRadius: radius.card, padding: 18, gap: 14, overflow: "hidden" },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(113,139,0,0.4)", // accent/primary on the dark hero
    borderWidth: 1,
    borderColor: "rgba(194,224,74,0.45)", // accent/highlight
  },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  heroChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    justifyContent: "center",
    backgroundColor: c.glassStrong,
  },
  suggestion: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: c.surface,
  },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: radius.input },
  thread: { flexGrow: 1, paddingHorizontal: gutter, paddingVertical: 20, gap: 16 },
  bubble: { maxWidth: "88%", borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 12 },
  mine: { alignSelf: "flex-end", backgroundColor: c.strong, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: c.surface, borderBottomLeftRadius: 6 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tool: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.chip,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: gutter,
    backgroundColor: c.ground,
  },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 140,
    borderRadius: 28,
    backgroundColor: c.surface,
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 17,
    fontFamily: fonts.sans400,
    fontSize: 15,
    lineHeight: 20,
    color: c.ink,
  },
  send: { width: 56, height: 56, borderRadius: 28, boxShadow: "0 8px 18px rgba(20, 24, 0, 0.32)" },
  sendFill: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
}));
