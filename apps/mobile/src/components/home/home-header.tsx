import { router } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { Text } from "@/components/ui";
import type { Me } from "@/lib/types";
import { makeStyles, useColors } from "@/lib/theme";

function greeting(hour: number) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const DATE = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short" });

/** Home header: today's date (+ Premium badge), the greeting, and the profile button. */
export function HomeHeader({ me }: { me: Pick<Me, "name" | "image" | "plan"> }) {
  const c = useColors();
  const styles = useStyles();
  const now = new Date();
  const firstName = me.name?.split(" ")[0];
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text weight={600} size={13} color={c.ink3}>
            {DATE.format(now)}
          </Text>
          {me.plan === "PRO" && <PremiumBadge />}
        </View>
        <Text variant="h1" size={26}>
          {greeting(now.getHours())}
          {firstName ? `, ${firstName}` : ""}
        </Text>
      </View>
      <ProfileButton name={me.name} image={me.image} />
    </View>
  );
}

/** Profile lives behind this button now that the tab bar is Home · Meals · Workout · Coach. */
function ProfileButton({ name, image }: { name: string | null; image: string | null }) {
  const c = useColors();
  const styles = useStyles();
  const initial = name?.trim()[0]?.toUpperCase();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Profile and settings"
      onPress={() => router.push("/profile")}
      hitSlop={6}
      style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.7 }]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.avatarImage} />
      ) : (
        <Text weight={700} size={16} color={c.ink}>
          {initial ?? "?"}
        </Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 44, height: 44 },
}));
