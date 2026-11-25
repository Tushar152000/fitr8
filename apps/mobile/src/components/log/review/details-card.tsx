import { Sparkles } from "lucide-react-native";
import { TextInput } from "react-native";
import { Button, Card, Text } from "@/components/ui";
import { fonts, makeStyles, radius, useColors } from "@/lib/theme";

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
    <Card style={{ gap: 10 }}>
      <Text weight={600}>Details</Text>
      <TextInput
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
      <Text size={13} color={c.ink3}>
        Saved with the meal. Re-check to let the AI correct the items using your details.
      </Text>
      <Button
        variant="secondary"
        icon={Sparkles}
        onPress={onRecheck}
        loading={rechecking}
        disabled={note.trim().length < 2}
      >
        Re-check with details
      </Button>
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  note: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: c.lineStrong,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sans400,
    fontSize: 15,
    color: c.ink,
  },
}));
