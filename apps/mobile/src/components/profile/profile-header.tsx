import { router } from "expo-router";
import { Camera, ImageIcon, Pencil, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Sheet } from "@/components/sheet";
import { Avatar, MenuGroup, MenuRow, PressableScale, Text } from "@/components/ui";
import { formatPhone } from "@/lib/profile-summary";
import { makeStyles, useColors } from "@/lib/theme";
import type { Me } from "@/lib/types";
import { canTakePhoto, useProfilePhoto } from "@/lib/use-profile-photo";

/**
 * Figma "Profile header": 64 px avatar with the "Change photo" camera badge (opens take / choose /
 * remove), full name (H1), the phone (Label/Medium; the email when there's no phone) and the pencil
 * → Account.
 */
export function ProfileHeader({ me }: { me: Me }) {
  const c = useColors();
  const styles = useStyles();
  const photo = useProfilePhoto();
  const [sheet, setSheet] = useState(false);
  const name = [me.name, me.lastName].filter(Boolean).join(" ") || "Your profile";
  const line = formatPhone(me.phone) ?? me.email;

  /** Close the sheet first so the system picker isn't stacked on top of our modal. */
  const run = (action: () => Promise<void>) => () => {
    setSheet(false);
    setTimeout(() => void action(), 250);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={me.hasPhoto ? "Change profile photo" : "Add a profile photo"}
        onPress={() => setSheet(true)}
        disabled={photo.busy}
        style={{ width: 64, height: 64 }}
      >
        <Avatar name={me.name ?? me.email} image={me.image} size={64} />
        <View style={styles.badge}>
          {photo.busy ? (
            <ActivityIndicator size="small" color={c.white} style={{ transform: [{ scale: 0.6 }] }} />
          ) : (
            <Camera size={13} color={c.white} strokeWidth={2} />
          )}
        </View>
      </PressableScale>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text variant="heading1" accessibilityRole="header" numberOfLines={1}>
          {name}
        </Text>
        {line ? (
          <Text variant="labelMedium" numberOfLines={1}>
            {line}
          </Text>
        ) : null}
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Edit name and phone"
        onPress={() => router.push("/settings/account")}
        style={styles.edit}
      >
        <Pencil size={20} color={c.ink} strokeWidth={2} />
      </PressableScale>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Profile photo">
        <MenuGroup>
          {canTakePhoto ? <MenuRow icon={Camera} title="Take a photo" onPress={run(photo.take)} /> : null}
          <MenuRow icon={ImageIcon} title="Choose from your photos" onPress={run(photo.choose)} />
          {me.hasPhoto ? (
            <MenuRow icon={Trash2} title="Remove photo" danger chevron={false} onPress={run(photo.remove)} />
          ) : null}
        </MenuGroup>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  badge: {
    position: "absolute",
    left: 38,
    top: 38,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: c.surface,
    backgroundColor: c.panel,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  edit: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
}));
