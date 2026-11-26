import { Check, ChevronRight, type LucideIcon } from "lucide-react-native";
import { Children, isValidElement, type ReactNode } from "react";
import { View } from "react-native";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

/** Figma "Icon Tile": 36 px, radius 12, 18 px glyph. `accent` = bg/accent-subtle with an olive icon. */
export function IconTile({ icon: Icon, accent, color }: { icon: LucideIcon; accent?: boolean; color?: string }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.tile, { backgroundColor: accent ? c.brandSoft : c.ground }]}>
      <Icon size={18} color={color ?? (accent ? c.brandText : c.ink)} strokeWidth={2} />
    </View>
  );
}

/**
 * Figma "Tag/Accent" used as a Menu Row's Status trailing: accent-subtle pill, 12 px check (or any
 * icon), Caption/Strong in the accent colour. `neutral` is the grey variant ("Coming soon").
 */
export function StatusPill({
  label,
  icon: Icon = Check,
  tone = "accent",
}: {
  label: string;
  icon?: LucideIcon | null;
  tone?: "accent" | "neutral";
}) {
  const c = useColors();
  const styles = useStyles();
  const color = tone === "accent" ? c.brandText : c.ink2;
  return (
    <View style={[styles.pill, { backgroundColor: tone === "accent" ? c.brandSoft : c.ground }]}>
      {Icon ? <Icon size={12} color={color} strokeWidth={2} /> : null}
      <Text variant="captionStrong" color={color} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Upper-case group heading above a MenuGroup (Label/Strong, secondary). */
export function SectionLabel({ children }: { children: string }) {
  const c = useColors();
  return (
    <Text variant="labelStrong" color={c.ink2} accessibilityRole="header">
      {children.toUpperCase()}
    </Text>
  );
}

/**
 * Figma "Group": white card (radius 20, 16 px sides, 4 px top/bottom) of MenuRows. The last row's
 * divider is turned off automatically; falsy children are skipped. With `label`, the SectionLabel
 * sits 10 px above.
 */
export function MenuGroup({
  label,
  children,
  dividerInset = 48,
  flush,
}: {
  label?: string;
  children: ReactNode;
  /** No card: the rows sit straight on a white surface (a sheet), edge to edge with its title. */
  flush?: boolean;
  /** Where the divider starts: 48 clears the icon tile; 0 for rows without icons. */
  dividerInset?: number;
}) {
  const styles = useStyles();
  const rows = Children.toArray(children).filter(isValidElement);
  const card = (
    <View style={flush ? styles.flush : styles.group}>
      {rows.map((row, i) => (
        <View key={row.key ?? i}>
          {row}
          {i < rows.length - 1 && <View style={[styles.divider, { marginLeft: dividerInset }]} />}
        </View>
      ))}
    </View>
  );
  if (!label) return card;
  return (
    <View style={{ gap: 10 }}>
      <SectionLabel>{label}</SectionLabel>
      {card}
    </View>
  );
}

/**
 * Figma "Menu Row": icon tile, title (Body/Strong) with an optional subtitle (Label/Regular,
 * secondary), then the trailing part: a value (Label/Medium, secondary) and/or chevron, or any
 * node (a switch, a status pill). Pressable when `onPress` is set.
 */
export function MenuRow({
  icon,
  accent,
  title,
  subtitle,
  value,
  trailing,
  chevron = true,
  onPress,
  selected,
  danger,
  disabled,
  accessibilityLabel,
}: {
  /** Optional: option lists (a sheet's choices) have no icon tile. */
  icon?: LucideIcon;
  accent?: boolean;
  title: string;
  subtitle?: string | null;
  value?: string | null;
  trailing?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  /** A choice in a list: announced as a selected radio. */
  selected?: boolean;
  /** Destructive action: title and glyph in the danger colour. */
  danger?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const styles = useStyles();
  const body = (
    <>
      {icon ? <IconTile icon={icon} accent={accent} color={danger ? c.danger : undefined} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" color={danger ? c.danger : undefined} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="labelRegular" color={c.ink2} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="labelMedium" color={c.ink2} numberOfLines={1} tabular>
          {value}
        </Text>
      ) : null}
      {trailing}
      {onPress && chevron && !trailing ? <ChevronRight size={18} color={c.ink2} strokeWidth={2} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <PressableScale
      accessibilityRole={selected === undefined ? "button" : "radio"}
      accessibilityState={{ disabled, ...(selected === undefined ? {} : { selected }) }}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(", ")}
      onPress={onPress}
      style={[styles.row, disabled && { opacity: 0.5 }]}
    >
      {body}
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  group: { backgroundColor: c.surface, borderRadius: radius.card, paddingHorizontal: 16, paddingVertical: 4 },
  flush: { paddingVertical: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  divider: { height: 1, backgroundColor: c.line },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
}));
