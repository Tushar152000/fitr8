import { router } from "expo-router";
import { Bell, BellRing } from "lucide-react-native";
import { Linking } from "react-native";
import { ProfilePage } from "@/components/profile/profile-page";
import { MenuGroup, MenuRow, StatusPill } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { remindersSummary } from "@/lib/profile-summary";
import { ensureNotificationPermission } from "@/lib/reminders";
import { useNotificationStatus } from "@/lib/use-notification-status";

const STATUS = {
  granted: { value: "On", sub: "FITR8 can send you reminders" },
  denied: { value: "Off", sub: "Turned off in your phone's Settings. Tap to open them" },
  undetermined: { value: "Not set", sub: "Tap to allow reminders" },
  unavailable: { value: null, sub: "Notifications work in the installed FITR8 app" },
} as const;

/**
 * Settings → Notifications: whether this phone lets FITR8 notify (and the way to fix it), then the
 * reminders themselves, which live on the Reminders screen.
 */
export default function NotificationsScreen() {
  const me = useMe();
  const status = useNotificationStatus();
  const s = status.value ? STATUS[status.value] : null;

  async function fix() {
    if (status.value === "denied") await Linking.openSettings();
    else if (status.value === "undetermined") await ensureNotificationPermission();
    status.refresh();
  }

  return (
    <ProfilePage title="Notifications" eyebrow="Settings">
      <MenuGroup>
        <MenuRow
          icon={Bell}
          title="Phone notifications"
          subtitle={s?.sub ?? " "}
          trailing={status.value === "granted" ? <StatusPill label="On" /> : undefined}
          value={status.value === "granted" ? null : s?.value}
          onPress={status.value === "denied" || status.value === "undetermined" ? fix : undefined}
        />
      </MenuGroup>
      <MenuGroup>
        <MenuRow
          icon={BellRing}
          title="Reminders"
          subtitle={`Meals, water and your own · ${remindersSummary(me.profile!)}`}
          onPress={() => router.push("/reminders")}
        />
      </MenuGroup>
    </ProfilePage>
  );
}
