import { ChevronDown } from "lucide-react-native";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { PressableScale, Section, Text } from "@/components/ui";
import { reveal } from "@/lib/motion";
import { makeStyles, useColors } from "@/lib/theme";
import { FEATURES } from "./data";
import { useListStyles } from "./list-styles";

/**
 * Design 14c "What you get": an accordion of the Premium features with one row open at a time;
 * the open row shows the detail and an example. Tapping the open row does nothing.
 */
export function FeatureList({ open, onExpand }: { open: string; onExpand: (key: string) => void }) {
  const c = useColors();
  const styles = useStyles();
  const list = useListStyles();
  return (
    <Section title="What you get">
      <View style={list.list}>
        {FEATURES.map((f, i) => {
          const expanded = open === f.key;
          return (
            <View key={f.key} style={i > 0 && list.divider}>
              <PressableScale
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${f.title}: ${f.line}`}
                onPress={() => {
                  if (expanded) return;
                  onExpand(f.key);
                }}
                style={list.row}
              >
                <View style={styles.icon}>
                  <f.icon size={18} color={c.brandText} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight={700}>{f.title}</Text>
                  <Text size={13} color={c.ink3}>
                    {f.line}
                  </Text>
                </View>
                <View style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}>
                  <ChevronDown size={18} color={c.ink3} />
                </View>
              </PressableScale>
              {expanded && (
                <Animated.View entering={reveal} style={styles.expanded}>
                  <Text size={14} color={c.ink2}>
                    {f.detail}
                  </Text>
                  <View style={styles.example}>
                    <Text size={12} weight={700} color={c.brandText} tabular>
                      {f.example}
                    </Text>
                  </View>
                </Animated.View>
              )}
            </View>
          );
        })}
      </View>
    </Section>
  );
}

const useStyles = makeStyles((c) => ({
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: c.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  expanded: { paddingRight: 14, paddingBottom: 14, paddingLeft: 62, gap: 8 },
  example: {
    alignSelf: "flex-start",
    backgroundColor: c.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
}));
