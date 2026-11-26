import { Crown, Sparkles } from "lucide-react-native";
import { TextInput, View } from "react-native";
import { Chip, FieldError, PillButton, Text } from "@/components/ui";
import { openPremium } from "@/lib/premium";
import { fonts, makeStyles, radius, useColors, INPUT_CARET } from "@/lib/theme";

const EXAMPLES = [
  "Take creatine every day at 9 am",
  "Stretch on weekdays at 6:30 pm",
  "Weigh in on the 1st and last day of the month",
];

/**
 * "New reminder" in the Figma Group style (white card, radius 20): describe it in words (or pick an
 * example), then set it up. At the limit it says so instead, and on the free plan it offers Premium
 * for unlimited reminders.
 */
export function NewReminderCard({
  text,
  onChangeText,
  onPickExample,
  error,
  max,
  full,
  upgradeForMore,
  parsing,
  onCreate,
}: {
  text: string;
  onChangeText: (text: string) => void;
  onPickExample: (example: string) => void;
  error: string | null;
  max: number;
  full: boolean;
  upgradeForMore: boolean;
  parsing: boolean;
  onCreate: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <TextInput
        {...INPUT_CARET}
        accessibilityLabel="Describe your reminder"
        value={text}
        onChangeText={onChangeText}
        multiline
        maxLength={300}
        editable={!full && !upgradeForMore}
        placeholder="e.g. Remind me to take creatine every day at 9 am"
        placeholderTextColor={c.ink3}
        style={[styles.textarea, error ? { borderColor: c.caution } : null]}
        textAlignVertical="top"
      />
      {!text.trim() && !full && !upgradeForMore && (
        <View style={styles.examples} accessibilityLabel="Examples">
          {EXAMPLES.map((e) => (
            <Chip key={e} onPress={() => onPickExample(e)}>
              {e}
            </Chip>
          ))}
        </View>
      )}
      {error && <FieldError>{error}</FieldError>}
      {upgradeForMore ? (
        <>
          <Text variant="labelRegular" color={c.ink2} style={{ lineHeight: 18 }}>
            Free includes {max} reminders of your own. Get unlimited reminders with FITR8 Premium, or delete one to add
            another.
          </Text>
          <PillButton label="Get unlimited reminders" icon={Crown} onPress={() => openPremium("reminders")} />
        </>
      ) : full ? (
        <Text variant="labelRegular" color={c.ink2} style={{ lineHeight: 18 }}>
          You have {max} reminders, the most you can keep. Delete one to add another.
        </Text>
      ) : (
        <PillButton
          label="Set up reminder"
          icon={Sparkles}
          onPress={onCreate}
          loading={parsing}
          disabled={!text.trim()}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surface, borderRadius: radius.card, padding: 16, gap: 12 },
  textarea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 12,
    backgroundColor: c.ground,
    padding: 14,
    fontFamily: fonts.sans400,
    fontSize: 14,
    lineHeight: 20,
    color: c.ink,
  },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
}));
