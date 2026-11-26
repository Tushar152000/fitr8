import { BellOff } from "lucide-react-native";
import { Linking, View } from "react-native";
import { PillButton, Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";
import type { NotificationStatus } from "@/lib/use-notification-status";

/**
 * Explains why nothing will ring, with the way to fix it, in the Profile tip-card shape (radius 16,
 * 16 px padding, Label/Medium). Hidden when notifications work or can still be asked for.
 */
export function PermissionNote({ status }: { status: NotificationStatus | null }) {
  const c = useColors();
  const styles = useStyles();
  if (status === null || status === "granted" || status === "undetermined") return null;
  const unavailable = status === "unavailable";
  return (
    <View style={styles.note}>
      <BellOff size={18} color={c.cautionText} strokeWidth={2} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text variant="labelMedium" color={c.cautionText} style={{ lineHeight: 18 }}>
          {unavailable
            ? "Reminders ring in the installed FITR8 app. You can still set them up here."
            : "Notifications are off for FITR8, so reminders can't ring. Turn them on in Settings."}
        </Text>
        {!unavailable && (
          <View style={{ alignSelf: "flex-start" }}>
            <PillButton variant="link" label="Open Settings" onPress={() => Linking.openSettings()} />
          </View>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 16,
    backgroundColor: c.cautionSoft,
    padding: 16,
  },
}));
