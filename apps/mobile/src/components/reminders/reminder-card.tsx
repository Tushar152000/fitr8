import type { ReminderDto } from "@fitr8/contracts";
import { View } from "react-native";
import { PressableScale, Switch, Text } from "@/components/ui";
import { localDate } from "@/lib/reminders";
import { formatNext } from "@/lib/reminder-format";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** One saved reminder: tap the text to edit it, the switch turns it on or off. */
export function ReminderCard({
  reminder: r,
  busy,
  onToggle,
  onOpen,
}: {
  reminder: ReminderDto;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onOpen: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const next = r.enabled && r.nextAt ? localDate(r.nextAt) : null;
  return (
    <View style={[styles.card, !r.enabled && { opacity: 0.7 }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${r.title}, ${r.summary}. Edit`}
        onPress={onOpen}
        style={{ flex: 1, gap: 2, minHeight: 44 }}
      >
        <Text weight={600} numberOfLines={1}>
          {r.title}
        </Text>
        {r.description ? (
          <Text size={13} color={c.ink2} numberOfLines={2}>
            {r.description}
          </Text>
        ) : null}
        <Text size={13} color={c.ink3}>
          {r.summary}
        </Text>
        {next && (
          <Text weight={600} size={13} color={c.brandText}>
            Next: {formatNext(next)}
          </Text>
        )}
      </PressableScale>
      <Switch checked={r.enabled} onChange={(v) => !busy && onToggle(v)} label={`${r.title} on`} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
}));
