import { BellOff } from "lucide-react-native";
import { Linking, View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";
import type { NotificationStatus } from "@/lib/use-notification-status";

/** Explains why nothing will ring, with the way to fix it. Hidden when notifications work. */
export function PermissionNote({ status }: { status: NotificationStatus | null }) {
  const c = useColors();
  const styles = useStyles();
  if (status === null || status === "granted" || status === "undetermined") return null;
  const unavailable = status === "unavailable";
  return (
    <View style={styles.note}>
      <BellOff size={20} color={c.cautionText} />
      <View style={{ flex: 1, gap: 8 }}>
        <Text size={14} color={c.cautionText}>
          {unavailable
            ? "Reminders ring in the installed FITR8 app. You can still set them up here."
            : "Notifications are off for FITR8, so reminders can't ring. Turn them on in Settings."}
        </Text>
        {!unavailable && (
          <PressableScale accessibilityRole="button" onPress={() => Linking.openSettings()} hitSlop={6}>
            <Text weight={600} size={14} color={c.cautionText} style={{ textDecorationLine: "underline" }}>
              Open Settings
            </Text>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  note: {
    flexDirection: "row",
    gap: 10,
    borderRadius: radius.card,
    backgroundColor: c.cautionSoft,
    padding: 14,
  },
}));
