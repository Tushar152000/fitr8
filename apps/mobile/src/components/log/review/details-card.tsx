import { Sparkles } from "lucide-react-native";
import { TextInput, View } from "react-native";
import { PillButton, Text } from "@/components/ui";
import { fonts, makeStyles, radius, useColors, INPUT_CARET } from "@/lib/theme";

/** The meal's note, saved with it, and "Re-check with details" to let the AI correct the items. */
export function DetailsCard({
  note,
  onNoteChange,
  onRecheck,
  rechecking,
}: {
  note: string;
  onNoteChange: (note: string) => void;
  onRecheck: () => void;
  rechecking: boolean;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text variant="heading3">Details</Text>
      {/* Inside a white card: the grey filled field, no outline (as the add-item sheet). */}
      <TextInput
        {...INPUT_CARET}
        accessibilityLabel="Details"
        value={note}
        onChangeText={onNoteChange}
        multiline
        maxLength={500}
        placeholder="e.g. small cup, 2 sachets sugar, full-cream milk"
        placeholderTextColor={c.ink3}
        style={styles.note}
        textAlignVertical="top"
      />
      <Text variant="labelRegular" color={c.ink2}>
        Saved with the meal. Re-check to let the AI correct the items using your details.
      </Text>
      <PillButton
        variant="soft"
        icon={Sparkles}
        label="Re-check with details"
        onPress={onRecheck}
        loading={rechecking}
        disabled={note.trim().length < 2}
      />
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  card: { gap: 12, borderRadius: radius.card, backgroundColor: c.surface, padding: 16, ...shadows.card },
  note: {
    minHeight: 72,
    borderRadius: radius.input,
    backgroundColor: c.ground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.sans400,
    fontSize: 16,
    color: c.ink,
    outlineWidth: 0,
  },
}));
