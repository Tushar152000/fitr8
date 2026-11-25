import { router } from "expo-router";
import { Bell, LogOut, Ruler, Shield, SunMoon, User } from "lucide-react-native";
import { useState } from "react";
import { OptionSheet } from "@/components/profile/option-sheet";
import { ProfilePage } from "@/components/profile/profile-page";
import { MenuGroup, MenuRow } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { confirmAction } from "@/lib/confirm";
import { useAppearance, type AppearancePreference } from "@/lib/theme";

const APPEARANCE: { value: AppearancePreference; label: string; sub?: string }[] = [
  { value: "system", label: "System", sub: "Matches your phone's light or dark setting" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Figma frame 15 "Profile / Settings": Account, Units (metric only for now), Appearance,
 * Notifications, Privacy & data and Log out.
 */
export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { preference, setPreference } = useAppearance();
  const [sheet, setSheet] = useState<"units" | "appearance" | null>(null);

  async function logOut() {
    if (await confirmAction("Log out?", "You can sign back in any time; your data stays saved.", "Log out")) signOut();
  }

  return (
    <ProfilePage title="Settings">
      <MenuGroup>
        <MenuRow icon={User} title="Account" onPress={() => router.push("/settings/account")} />
        <MenuRow icon={Ruler} title="Units" value="Metric" onPress={() => setSheet("units")} />
        <MenuRow
          icon={SunMoon}
          title="Appearance"
          value={APPEARANCE.find((a) => a.value === preference)?.label}
          onPress={() => setSheet("appearance")}
        />
        <MenuRow icon={Bell} title="Notifications" onPress={() => router.push("/settings/notifications")} />
        <MenuRow icon={Shield} title="Privacy & data" onPress={() => router.push("/settings/privacy")} />
        <MenuRow icon={LogOut} title="Log out" onPress={logOut} />
      </MenuGroup>

      <OptionSheet
        open={sheet === "units"}
        title="Units"
        value="metric"
        options={[
          { value: "metric", label: "Metric", sub: "kg, cm, ml" },
          { value: "imperial", label: "Imperial", sub: "lb, ft/in, fl oz", soon: true },
        ]}
        note="FITR8 uses metric units everywhere for now."
        onPick={() => setSheet(null)}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        open={sheet === "appearance"}
        title="Appearance"
        value={preference}
        options={APPEARANCE}
        onPick={(v) => {
          setPreference(v);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
    </ProfilePage>
  );
}
