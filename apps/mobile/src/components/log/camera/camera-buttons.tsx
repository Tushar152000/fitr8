import { Camera, ScanBarcode, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { MovingGradient, PressableScale, Text } from "@/components/ui";
import { cam, CAM_GLASS, CAM_MUTED } from "./cam";

/**
 * 44 px glass circle in the camera's header (close, back, torch). `on`: a toggle that is on (the
 * torch) turns white with a dark glyph, like the selected meal pill.
 */
export function CameraTopButton({
  icon: Icon,
  label,
  onPress,
  iconSize = 20,
  on,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  iconSize?: number;
  /** Set for a toggle (adds the switch role). */
  on?: boolean;
  disabled?: boolean;
}) {
  const toggle = on !== undefined;
  return (
    <PressableScale
      accessibilityRole={toggle ? "switch" : "button"}
      accessibilityLabel={label}
      accessibilityState={toggle ? { checked: on, disabled } : { disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[styles.top, on && { backgroundColor: cam.white }, disabled && { opacity: 0.4 }]}
    >
      <Icon size={iconSize} color={on ? cam.ink : cam.white} strokeWidth={2} absoluteStrokeWidth />
    </PressableScale>
  );
}

/** A 56 px glass circle beside the shutter (gallery, type), with an optional caption under it. */
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
  const icon = <Icon size={22} color={cam.white} strokeWidth={2} absoluteStrokeWidth />;
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
      accessibilityLabel={accessibilityLabel ?? caption}
      onPress={onPress}
      disabled={disabled}
      style={styles.side}
    >
      <View style={styles.sideIcon}>{icon}</View>
      <Text variant="labelStrong" color={CAM_MUTED}>
        {caption}
      </Text>
    </PressableScale>
  );
}

/**
 * The shutter: an 84 px white ring round the gradient/primary disc with the camera glyph; the disc
 * sinks while held. `barcode`: a code is in view, so the disc turns lime with a barcode glyph and
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
      style={[styles.ring, barcode && { borderColor: cam.highlight }, dimmed && { opacity: 0.5 }]}
    >
      {({ pressed }) => (
        <View style={[styles.disc, pressed && { transform: [{ scale: 0.95 }] }]}>
          {barcode ? (
            <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: cam.highlight }]}>
              <ScanBarcode size={28} color={cam.ink} strokeWidth={2.3} absoluteStrokeWidth />
            </View>
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              <MovingGradient width={68} height={68} />
              <Camera size={27.5} color={cam.white} strokeWidth={2} />
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CAM_GLASS,
    alignItems: "center",
    justifyContent: "center",
  },
  side: { alignItems: "center", gap: 8 },
  sideIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: CAM_GLASS,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: cam.white,
    alignItems: "center",
    justifyContent: "center",
  },
  disc: { width: 68, height: 68, borderRadius: 34, overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
});
