import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { FieldError, PressableScale, Switch, Text } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/theme";

/** A read-only setting: label on the left, value (and an optional note under it) on the right. */
export function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text color={c.ink2}>{label}</Text>
      <View style={{ alignItems: "flex-end" }}>
        <Text weight={600} tabular>
          {value}
        </Text>
        {sub && (
          <Text size={12} color={c.ink3}>
            {sub}
          </Text>
        )}
      </View>
    </View>
  );
}

/** A tappable row that opens something: optional icon, label, a line under it, and a chevron. */
export function LinkRow({
  label,
  sub,
  icon,
  onPress,
}: {
  label: string;
  sub?: string;
  icon?: ReactNode;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon}
        <View style={{ flex: 1 }}>
          <Text weight={600}>{label}</Text>
          {sub && (
            <Text size={13} color={c.ink3}>
              {sub}
            </Text>
          )}
        </View>
      </View>
      <ChevronRight size={20} color={c.ink3} />
    </PressableScale>
  );
}

/** A setting with a switch: label, a line under it, then any extra lines (`children`). */
export function SwitchRow({
  label,
  sub,
  checked,
  onChange,
  children,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  children?: ReactNode;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.row, { minHeight: 56 }]}>
      <View style={{ flex: 1 }}>
        <Text weight={600}>{label}</Text>
        <Text size={13} color={c.ink3}>
          {sub}
        </Text>
        {children}
      </View>
      <Switch checked={checked} onChange={onChange} label={label} />
    </View>
  );
}

/** An error line under a group's rows, inset like the rows. */
export function RowError({ children }: { children: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
      <FieldError>{children}</FieldError>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
}));
