import { RotateCw } from "lucide-react-native";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import Animated from "react-native-reanimated";
import { Bubble, ThreadSkeleton } from "@/components/coach/bubble";
import { CoachHeader } from "@/components/coach/coach-header";
import { CoachMenu } from "@/components/coach/coach-menu";
import { Composer } from "@/components/coach/composer";
import { Intro } from "@/components/coach/intro";
import { ProblemNotice } from "@/components/coach/problem-notice";
import { Button, Card, FieldError } from "@/components/ui";
import { bubbleIn } from "@/lib/motion";
import { usePremium } from "@/lib/premium";
import { gutter, makeStyles, useColors } from "@/lib/theme";
import { useCoachChat } from "@/lib/use-coach-chat";

/** Chat with the FITR8 coach. Replies stream in; the thread is kept so reopening continues it. */
export default function CoachScreen() {
  const c = useColors();
  const styles = useStyles();
  const { locked, isPremium } = usePremium();
  const coachLocked = locked("coach");
  const chat = useCoachChat({ locked: coachLocked });
  const [menu, setMenu] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const canSend = chat.draft.trim().length > 0 && !chat.sending && chat.status === "ready";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.ground }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <CoachHeader isPremium={isPremium} onMenu={() => setMenu(true)} />

      <CoachMenu
        open={menu}
        onClose={() => setMenu(false)}
        canStartNew={chat.messages.length > 0 || Boolean(chat.conversationId)}
        onNewChat={chat.newChat}
      />

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        // Follow the conversation as replies stream in; the intro stays at the top.
        onContentSizeChange={() => {
          if (chat.messages.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
        }}
        contentContainerStyle={styles.thread}
      >
        {chat.status === "loading" ? (
          <ThreadSkeleton />
        ) : chat.status === "error" ? (
          <Card>
            <FieldError>{chat.loadError}</FieldError>
            <Button variant="secondary" icon={RotateCw} onPress={chat.reload}>
              Try again
            </Button>
          </Card>
        ) : chat.messages.length === 0 ? (
          <Intro onPick={chat.send} locked={coachLocked} />
        ) : (
          chat.messages.map((m) => (
            <Animated.View key={m.id} entering={bubbleIn}>
              <Bubble message={m} />
            </Animated.View>
          ))
        )}

        {chat.problem && <ProblemNotice problem={chat.problem} />}
      </ScrollView>

      <Composer
        draft={chat.draft}
        onChangeDraft={chat.setDraft}
        editable={chat.status === "ready"}
        sending={chat.sending}
        canSend={canSend}
        onSend={() => chat.send(chat.draft)}
        onStop={chat.stop}
      />
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(() => ({
  thread: { flexGrow: 1, paddingHorizontal: gutter, paddingVertical: 20, gap: 16 },
}));
