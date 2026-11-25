import { Barcode, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { PressableScale, Text } from "@/components/ui";
import { cam } from "./cam";

/** 44 px icon button in the camera's top bar (close, back). */
export function CameraTopButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.top}>
      <Icon size={26} color={cam.white} />
    </PressableScale>
  );
}

/** A square glass button beside the shutter (gallery, type), with an optional caption under it. */
export function CameraSideButton({
  icon: Icon,
  caption,
  accessibilityLabel,
  onPress,
  disabled,
}: {
  icon: LucideIcon;
  caption?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const icon = <Icon size={24} color={cam.white} />;
  if (!caption) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        disabled={disabled}
        style={styles.sideIcon}
      >
        {icon}
      </PressableScale>
    );
  }
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={styles.side}
    >
      <View style={styles.sideIcon}>{icon}</View>
      <Text weight={600} size={12} color="rgba(255,255,255,0.85)">
        {caption}
      </Text>
    </PressableScale>
  );
}

/**
 * The round shutter; its disc sinks while held. `barcode`: a code is in view, so it turns green and
 * looks the product up instead of taking a photo.
 */
export function Shutter({
  accessibilityLabel,
  accessibilityHint,
  onPress,
  disabled,
  dimmed,
  barcode = false,
}: {
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  disabled: boolean;
  dimmed: boolean;
  barcode?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={disabled}
      style={[styles.shutter, barcode && { borderColor: "rgba(221,235,227,0.6)" }, dimmed && { opacity: 0.5 }]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.shutterInner,
            barcode && { backgroundColor: cam.protein },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
        >
          {barcode && <Barcode size={28} color={cam.white} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  side: { alignItems: "center", gap: 4, width: 64 },
  sideIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: cam.brandGlow,
    alignItems: "center",
    justifyContent: "center",
  },
});
