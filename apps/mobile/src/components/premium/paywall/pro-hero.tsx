import { Camera, Crown, Keyboard, X } from "lucide-react-native";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** Design 14c top bar: the crown mark with "FITR8 Premium", and ✕ to leave without buying. */
export function ProTopBar({ onClose }: { onClose: () => void }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.topRow}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={styles.crown}>
          <Crown size={16} color={c.white} strokeWidth={2.2} />
        </View>
        <Text weight={700}>FITR8 Premium</Text>
      </View>
      <PressableScale accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
        <X size={22} color={c.ink2} />
      </PressableScale>
    </View>
  );
}

/** Design 14c hero on the dark panel: what changes with Premium, Free and Premium side by side. */
export function ProHero() {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.hero}>
      <Text variant="h1" color={c.white}>
        Log meals in seconds, not minutes
      </Text>
      <Text color="rgba(255,255,255,0.78)">
        Photo and barcode scanning, an AI coach and unlimited reminders, on top of everything in Free.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={styles.mini}>
          <View style={styles.miniHead}>
            <Keyboard size={14} color="rgba(255,255,255,0.7)" />
            <Text size={12} weight={700} color="rgba(255,255,255,0.7)">
              FREE
            </Text>
          </View>
          <Text size={13} color="rgba(255,255,255,0.85)">
            Type each item: dal, rice, sabzi, 2 roti
          </Text>
        </View>
        <View style={[styles.mini, styles.miniPremium]}>
          <View style={styles.miniHead}>
            <Camera size={14} color={c.brandGlow} />
            <Text size={12} weight={700} color={c.brandGlow}>
              PREMIUM
            </Text>
          </View>
          <Text size={13} color={c.white}>
            One photo of the thali. All 4 items found.
          </Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: -8 },
  crown: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10 },
  hero: {
    backgroundColor: c.panel,
    borderWidth: 1,
    borderColor: c.panelLine,
    borderRadius: radius.card,
    padding: 20,
    gap: 12,
  },
  mini: { flex: 1, gap: 6, padding: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)" },
  miniPremium: { backgroundColor: "rgba(194,224,74,0.18)", borderWidth: 1, borderColor: "rgba(194,224,74,0.45)" },
  miniHead: { flexDirection: "row", alignItems: "center", gap: 6 },
}));
