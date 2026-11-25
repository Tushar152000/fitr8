import { Image } from "expo-image";
import { Flame } from "lucide-react-native";
import { View } from "react-native";
import { PremiumBadge } from "@/components/premium/premium-badge";
import { Text } from "@/components/ui";
import { PlanPill } from "./plan-pill";
import { makeStyles, useColors } from "@/lib/theme";
import type { Me } from "@/lib/types";

/** Screen 13 header: avatar (photo or initial), full name, plan badge and the logging streak. */
export function ProfileHeader({ me, pro, streak }: { me: Me; pro: boolean; streak: number }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      {me.image ? (
        <Image source={{ uri: me.image }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: c.panel, alignItems: "center", justifyContent: "center" }]}>
          <Text variant="h1" size={24} color={c.white}>
            {(me.name ?? me.email ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text variant="h1" size={26} numberOfLines={1}>
          {[me.name, me.lastName].filter(Boolean).join(" ") || "Your profile"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {pro ? <PremiumBadge label="FITR8 Premium" size="md" /> : <PlanPill label="Free plan" size={13} />}
          {streak > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Flame size={16} color={c.brandGlow} fill={c.brandGlow} />
              <Text weight={600} size={13} color={c.ink3}>
                {streak}-day streak
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.sunken },
}));
