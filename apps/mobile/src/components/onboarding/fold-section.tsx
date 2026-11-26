import { Check, ChevronDown, Info } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { makeStyles, radius, useColors } from "@/lib/theme";
import { OnSurface } from "@/components/ui/surface";

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
    <View style={styles.fold}>
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
                : { backgroundColor: c.ground },
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
          <Text variant="heading3">{title}</Text>
          {!open && (
            <Text
              variant={attention ? "labelStrong" : "labelRegular"}
              numberOfLines={1}
              color={attention ? c.cautionText : c.ink2}
            >
              {attention ? "Something here needs a look" : summary || "Not answered yet"}
            </Text>
          )}
        </View>
        <ChevronDown
          size={20}
          color={c.ink2}
          strokeWidth={2}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </PressableScale>
      {open && (
        <View style={styles.foldBody}>
          <OnSurface>{children}</OnSurface>
        </View>
      )}
    </View>
  );
}

/** A v2 white card (radius 20, card lift, no outline); 16 px padding like the list cards. */
const useStyles = makeStyles((c, shadows) => ({
  fold: { borderRadius: radius.card, backgroundColor: c.surface, ...shadows.card },
  foldHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  /** Figma "Icon Tile": 36 px, radius 12. */
  foldBadge: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  foldBody: {
    gap: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: c.lineStrong,
  },
}));
