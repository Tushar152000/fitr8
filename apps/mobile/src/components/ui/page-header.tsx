import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { makeStyles, useColors } from "@/lib/theme";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Figma "Icon Button": 44 px white circle with the card lift, 20 px glyph. */
export function IconButton({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  const styles = useStyles();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.round}>
      {icon}
    </PressableScale>
  );
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/**
 * Figma "Top Bar" of the Profile pages: round back button, then an eyebrow (Label/Strong,
 * secondary) over the title (Heading/H1). `badge` sits right after the title (the coach's Premium
 * tag); `trailing` at the right edge (e.g. the coach's history button).
 */
export function PageHeader({
  title,
  eyebrow,
  onBack = goBack,
  trailing,
  badge,
}: {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  badge?: ReactNode;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <IconButton label="Back" onPress={onBack} icon={<ChevronLeft size={20} color={c.ink} strokeWidth={2} />} />
      <View style={{ flex: 1, gap: 2 }}>
        {eyebrow ? (
          <Text variant="labelStrong" color={c.ink2} numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        {badge ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text variant="heading1" accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1 }}>
              {title}
            </Text>
            {badge}
          </View>
        ) : (
          <Text variant="heading1" accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>
      {trailing}
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
}));
