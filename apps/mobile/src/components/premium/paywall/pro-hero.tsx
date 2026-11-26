import { LinearGradient } from "expo-linear-gradient";
import { Camera, Keyboard } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { COACH_HERO } from "@/lib/gradients";
import { makeStyles, radius, useColors } from "@/lib/theme";

/**
 * Design 14c hero, on the v2 black-to-olive gradient card (fixed in both themes, like the Coach hero
 * and Profile's Premium card): what changes with Premium, Free and Premium side by side.
 */
export function ProHero() {
  const c = useColors();
  const styles = useStyles();
  return (
    <LinearGradient {...COACH_HERO} style={styles.hero}>
      <View style={{ gap: 6 }}>
        <Text variant="title" color={c.white} accessibilityRole="header">
          Log meals in seconds, not minutes
        </Text>
        <Text variant="bodySm" color={c.onInverse2}>
          Photo and barcode scanning, an AI coach and unlimited reminders, on top of everything in Free.
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={styles.mini}>
          <View style={styles.miniHead}>
            <Keyboard size={14} color={c.onInverse2} />
            <Text variant="captionStrong" color={c.onInverse2}>
              FREE
            </Text>
          </View>
          <Text variant="labelRegular" color={c.onInverse2} style={styles.miniText}>
            Type each item: dal, rice, sabzi, 2 roti
          </Text>
        </View>
        <View style={[styles.mini, styles.miniPremium]}>
          <View style={styles.miniHead}>
            <Camera size={14} color={c.highlight} />
            <Text variant="captionStrong" color={c.highlight}>
              PREMIUM
            </Text>
          </View>
          <Text variant="labelRegular" color={c.white} style={styles.miniText}>
            One photo of the thali. All 4 items found.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  hero: { borderRadius: radius.card, padding: 20, gap: 16, overflow: "hidden", ...shadows.card },
  mini: { flex: 1, gap: 6, padding: 12, borderRadius: 14, backgroundColor: c.glass },
  // The lime highlight at low alpha: the Premium side of the comparison, on the always-dark card.
  miniPremium: { backgroundColor: "rgba(194,224,74,0.16)", borderWidth: 1, borderColor: "rgba(194,224,74,0.4)" },
  miniHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  miniText: { lineHeight: 17 },
}));
