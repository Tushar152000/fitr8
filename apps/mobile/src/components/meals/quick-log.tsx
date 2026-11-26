import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Camera, ScanBarcode, Search, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { PressableScale, SectionLabel, Text } from "@/components/ui";
import { PRIMARY_PILL } from "@/lib/gradients";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * Figma "Quick log" (Meals): Snap meal (camera), Scan barcode (the same camera, which reads
 * barcodes live) and Search food (typing / search). `date` = a past day in the logging window.
 */
export function QuickLog({ date }: { date: string | null }) {
  const params = date ? { date } : {};
  return (
    <View style={{ gap: 10 }}>
      <SectionLabel>Quick log</SectionLabel>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Action icon={Camera} label="Snap meal" primary onPress={() => router.push({ pathname: "/log", params })} />
        <Action icon={ScanBarcode} label="Scan barcode" onPress={() => router.push({ pathname: "/log", params })} />
        <Action icon={Search} label="Search food" onPress={() => router.push({ pathname: "/log/type", params })} />
      </View>
    </View>
  );
}

function Action({
  icon: Icon,
  label,
  primary,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const glyph = <Icon size={18} color={primary ? c.white : c.ink} strokeWidth={2} />;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}>
      {primary ? (
        <LinearGradient {...PRIMARY_PILL} style={styles.tile}>
          {glyph}
        </LinearGradient>
      ) : (
        <View style={[styles.tile, { backgroundColor: c.ground }]}>{glyph}</View>
      )}
      <Text variant="labelStrong" numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  action: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  tile: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
}));
