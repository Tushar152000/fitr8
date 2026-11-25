import { Camera } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { PillButton, Text } from "@/components/ui";
import { cam, CAM_GLASS, CAM_MUTED } from "./cam";

/** In the viewfinder while the camera is off: why it's needed, and "Allow camera" while it can still ask. */
export function CameraPermission({
  title,
  message,
  canAsk,
  onAllow,
}: {
  title?: string;
  message: string;
  canAsk: boolean;
  onAllow: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.icon}>
        <Camera size={22} color={cam.white} strokeWidth={2} absoluteStrokeWidth />
      </View>
      {title && (
        <Text variant="heading3" color={cam.white} center>
          {title}
        </Text>
      )}
      <Text variant="bodySm" color={CAM_MUTED} center>
        {message}
      </Text>
      {canAsk && <PillButton variant="onDark" label="Allow camera" onPress={onAllow} style={{ marginTop: 8 }} />}
    </View>
  );
}

/** Dims the viewfinder with a spinner and what's happening (uploading, reading). */
export function CameraBusy({ label }: { label: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: "rgba(12,12,12,0.75)" }]}>
      <ActivityIndicator color={cam.highlight} size="large" />
      <Text variant="bodyStrong" color={cam.white} accessibilityLiveRegion="polite">
        {label}
      </Text>
    </View>
  );
}

/** The error line under the viewfinder (amber on the dark camera). */
export function CameraError({ message }: { message: string }) {
  return (
    <Text variant="bodyStrong" size={13} color="#ffb68a" center style={{ marginHorizontal: 20, marginTop: 12 }}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 32 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: CAM_GLASS,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
