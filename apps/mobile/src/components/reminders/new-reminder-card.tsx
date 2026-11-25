import { Crown, Sparkles } from "lucide-react-native";
import { TextInput, View } from "react-native";
import { Button, Card, Chip, FieldError, Text } from "@/components/ui";
import { openPremium } from "@/lib/premium";
import { fonts, makeStyles, radius, useColors } from "@/lib/theme";

const EXAMPLES = [
  "Take creatine every day at 9 am",
  "Drink water every 2 hours",
  "Stretch on weekdays at 6:30 pm",
  "Weigh in every Monday at 7 am",
  "Weigh in on the 1st and last day of the month",
];

/**
 * "New reminder": describe it in words (or pick an example), then set it up. At the limit it says
 * so instead, and on the free plan it offers Premium for unlimited reminders.
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
    <Card style={{ gap: 12 }}>
      <Text weight={600}>New reminder</Text>
      <TextInput
        accessibilityLabel="Describe your reminder"
        value={text}
        onChangeText={onChangeText}
        multiline
        maxLength={300}
        editable={!full}
        placeholder="e.g. Remind me to take creatine every day at 9 am"
        placeholderTextColor={c.ink3}
        style={styles.textarea}
        textAlignVertical="top"
      />
      {!text.trim() && !full && (
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
        <View style={{ gap: 10 }}>
          <Text size={13} color={c.ink2}>
            Free includes {max} reminders of your own. Get unlimited reminders with FITR8 Premium, or delete one to add
            another.
          </Text>
          <Button icon={Crown} onPress={() => openPremium("reminders")}>
            Get unlimited reminders
          </Button>
        </View>
      ) : full ? (
        <Text size={13} color={c.ink3}>
          You have {max} reminders, the most you can keep. Delete one to add another.
        </Text>
      ) : (
        <Button icon={Sparkles} onPress={onCreate} loading={parsing} disabled={!text.trim()}>
          Set up reminder
        </Button>
      )}
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  textarea: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: c.lineStrong,
    borderRadius: radius.input,
    backgroundColor: c.surface,
    padding: 14,
    fontFamily: fonts.sans400,
    fontSize: 16,
    lineHeight: 22,
    color: c.ink,
  },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
}));
