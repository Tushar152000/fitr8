import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { makeStyles } from "@/lib/theme";

/** The pill above the plan ("Realistic goal", "Too fast to be safe"): an icon and a label on a soft tone. */
export function PlanBadge({
  icon,
  label,
  color,
  background,
}: {
  icon: ReactNode;
  label: string;
  color: string;
  background: string;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      {icon}
      <Text variant="labelStrong" color={color}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
}));
