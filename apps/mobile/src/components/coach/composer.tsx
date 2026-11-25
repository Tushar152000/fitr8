import { ArrowUp, Square } from "lucide-react-native";
import { TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COACH_MAX_LENGTH } from "@/lib/use-coach-chat";
import { fonts, gutter, makeStyles, useColors } from "@/lib/theme";
import { GradientFab } from "@/components/ui";

/** Pill message box with the gradient send button, which turns into stop while a reply streams. */
export function Composer({
  draft,
  onChangeDraft,
  editable,
  sending,
  canSend,
  onSend,
  onStop,
}: {
  draft: string;
  onChangeDraft: (text: string) => void;
  editable: boolean;
  sending: boolean;
  canSend: boolean;
  onSend: () => void;
  onStop: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.composer, { paddingBottom: Math.max(12, insets.bottom) }]}>
      <TextInput
        accessibilityLabel="Message your coach"
        value={draft}
        onChangeText={onChangeDraft}
        editable={editable}
        multiline
        maxLength={COACH_MAX_LENGTH}
        placeholder="Ask your coach..."
        numberOfLines={1}
        placeholderTextColor={c.ink3}
        style={styles.input}
        textAlignVertical="center"
      />
      {sending ? (
        <GradientFab accessibilityRole="button" accessibilityLabel="Stop the reply" onPress={onStop}>
          <Square size={16} color="#ffffff" fill="#ffffff" />
        </GradientFab>
      ) : (
        <GradientFab
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
        >
          <ArrowUp size={22} color="#ffffff" strokeWidth={2.2} />
        </GradientFab>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
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
}));
