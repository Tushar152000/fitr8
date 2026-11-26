import { ArrowUp, Mic, Square } from "lucide-react-native";
import { useEffect, useState } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COACH_MAX_LENGTH } from "@/lib/use-coach-chat";
import { useKeyboardVisible } from "@/lib/use-keyboard";
import { fonts, gutter, makeStyles, useColors, INPUT_CARET } from "@/lib/theme";
import { FieldError, GradientFab, PressableScale } from "@/components/ui";
import { useVoiceInput } from "@/lib/use-voice-input";

/**
 * Figma "Composer": 60 px pill message box with a mic (talk instead of type, `useVoiceInput`) and
 * the 60 px gradient send button, which turns into stop while a reply streams.
 */
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
  // With the keyboard up the composer sits right on it (as in WhatsApp); otherwise it keeps clear
  // of the home indicator.
  const keyboard = useKeyboardVisible();
  // Talk instead of type (Figma "Composer" mic): what's said fills the box live.
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const voice = useVoiceInput({ draft, onText: onChangeDraft, onError: setVoiceError });
  return (
    <View style={[styles.wrap, { paddingBottom: keyboard ? 10 : Math.max(24, insets.bottom - 10) }]}>
      {voiceError && <FieldError>{voiceError}</FieldError>}
      <View style={styles.composer}>
        <View style={styles.field}>
          <TextInput
            {...INPUT_CARET}
            accessibilityLabel="Message your coach"
            value={draft}
            onChangeText={(t) => {
              setVoiceError(null);
              onChangeDraft(t);
            }}
            editable={editable}
            multiline
            maxLength={COACH_MAX_LENGTH}
            placeholder={voice.listening ? "Listening…" : "Ask your coach…"}
            numberOfLines={1}
            placeholderTextColor={voice.listening ? c.brandText : c.ink3}
            style={styles.input}
            textAlignVertical="center"
          />
          {/* Always shown, as designed; where voice can't run, a tap says why (useVoiceInput). */}
          <MicButton
            listening={voice.listening}
            disabled={!editable || sending}
            onPress={() => {
              setVoiceError(null);
              void voice.toggle();
            }}
          />
        </View>
        {sending ? (
          <GradientFab accessibilityRole="button" accessibilityLabel="Stop the reply" onPress={onStop}>
            <Square size={18} color="#ffffff" fill="#ffffff" />
          </GradientFab>
        ) : (
          <GradientFab
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={onSend}
          >
            <ArrowUp size={24} color="#ffffff" strokeWidth={2} />
          </GradientFab>
        )}
      </View>
    </View>
  );
}

/** The mic inside the message box: grey; olive with a soft pulse while listening. */
function MicButton({ listening, disabled, onPress }: { listening: boolean; disabled: boolean; onPress: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (listening && !reduce)
      pulse.set(withRepeat(withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }), -1));
    else {
      cancelAnimation(pulse);
      pulse.set(0);
    }
  }, [listening, reduce, pulse]);
  const ring = useAnimatedStyle(() => ({
    opacity: listening ? 0.35 * (1 - pulse.get()) : 0,
    transform: [{ scale: 1 + pulse.get() * 0.8 }],
  }));
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={listening ? "Stop listening" : "Talk to your coach"}
      accessibilityState={{ disabled, selected: listening }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.mic, disabled && { opacity: 0.5 }]}
    >
      <Animated.View style={[styles.micRing, { backgroundColor: c.brand }, ring]} />
      <Mic size={20} color={listening ? c.brandText : c.ink2} strokeWidth={2} />
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { gap: 8, paddingTop: 10, paddingHorizontal: gutter, backgroundColor: c.ground },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  // Figma "Input": 60 px white pill, text 22 in on the left, the mic 18 in on the right.
  field: {
    flex: 1,
    minHeight: 60,
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 30,
    backgroundColor: c.surface,
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    maxHeight: 140,
    paddingTop: 20,
    paddingBottom: 20,
    fontFamily: fonts.sans400,
    fontSize: 14,
    lineHeight: 20,
    color: c.ink,
  },
  mic: { width: 44, height: 44, marginBottom: 8, alignItems: "center", justifyContent: "center" },
  micRing: { position: "absolute", width: 32, height: 32, borderRadius: 16 },
}));
