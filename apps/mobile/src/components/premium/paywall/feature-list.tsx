import { ChevronDown } from "lucide-react-native";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { IconTile, PressableScale, StatusPill, Text } from "@/components/ui";
import { reveal } from "@/lib/motion";
import { useColors } from "@/lib/theme";
import { FEATURES } from "./data";
import { PaywallGroup } from "./group";
import { useListStyles } from "./list-styles";

/**
 * Design 14c "What you get": an accordion of the Premium features with one row open at a time;
 * the open row shows the detail and an example. Tapping the open row does nothing.
 */
export function FeatureList({ open, onExpand }: { open: string; onExpand: (key: string) => void }) {
  const c = useColors();
  const list = useListStyles();
  return (
    <PaywallGroup label="What you get">
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
                <IconTile icon={f.icon} accent />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong">{f.title}</Text>
                  <Text variant="labelRegular" color={c.ink2}>
                    {f.line}
                  </Text>
                </View>
                <ChevronDown
                  size={18}
                  color={c.ink2}
                  strokeWidth={2}
                  style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
                />
              </PressableScale>
              {expanded && (
                <Animated.View entering={reveal} style={{ paddingBottom: 14, paddingLeft: 48, gap: 8 }}>
                  <Text variant="bodySm" color={c.ink2}>
                    {f.detail}
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    <StatusPill label={f.example} icon={null} />
                  </View>
                </Animated.View>
              )}
            </View>
          );
        })}
      </View>
    </PaywallGroup>
  );
}
