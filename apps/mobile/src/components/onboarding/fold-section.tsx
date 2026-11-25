import { Check, ChevronDown, Info } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** One part of the merged "About you" step: tap the header to fold it open and shut. */
export function FoldSection({
  icon,
  title,
  summary,
  done,
  attention,
  open,
  onToggle,
  children,
}: {
  /** Shown in the badge until the part is done (then a tick) or has an error. */
  icon: ReactNode;
  title: string;
  summary: string;
  done: boolean;
  attention: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.fold, open && styles.foldOpen]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${done ? ", done" : ""}${attention ? ", needs a look" : ""}`}
        onPress={onToggle}
        style={styles.foldHead}
      >
        <View
          style={[
            styles.foldBadge,
            attention
              ? { backgroundColor: c.cautionSoft }
              : done
                ? { backgroundColor: c.brand }
                : { backgroundColor: c.sunken },
          ]}
        >
          {attention ? (
            <Info size={16} color={c.cautionText} />
          ) : done ? (
            <Check size={16} color={c.white} strokeWidth={3} />
          ) : (
            icon
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="h2">{title}</Text>
          {!open && (
            <Text size={13} numberOfLines={1} weight={attention ? 600 : 400} color={attention ? c.cautionText : c.ink3}>
              {attention ? "Something here needs a look" : summary || "Not answered yet"}
            </Text>
          )}
        </View>
        <ChevronDown size={20} color={c.ink3} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </PressableScale>
      {open && <View style={styles.foldBody}>{children}</View>}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  fold: { borderRadius: radius.card, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
  foldOpen: { borderColor: c.brand, borderWidth: 1.5 },
  foldHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  foldBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  foldBody: {
    gap: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
}));
