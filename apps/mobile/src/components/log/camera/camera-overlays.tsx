import { Camera } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Button, Text } from "@/components/ui";
import { cam } from "./cam";

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
      <Camera size={32} color="rgba(255,255,255,0.6)" />
      {title && (
        <Text weight={600} color={cam.white} center>
          {title}
        </Text>
      )}
      <Text size={13} color="rgba(255,255,255,0.7)" center>
        {message}
      </Text>
      {canAsk && (
        <View style={{ alignSelf: "stretch", marginTop: 8 }}>
          <Button onPress={onAllow}>Allow camera</Button>
        </View>
      )}
    </View>
  );
}

/** Dims the viewfinder with a spinner and what's happening (uploading, reading). */
export function CameraBusy({ label }: { label: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: "rgba(23,24,28,0.75)" }]}>
      <ActivityIndicator color={cam.white} size="large" />
      <Text weight={600} color={cam.white} accessibilityLiveRegion="polite">
        {label}
      </Text>
    </View>
  );
}

/** The error line under the viewfinder (amber on the dark camera). */
export function CameraError({ message }: { message: string }) {
  return (
    <Text weight={600} size={13} color="#ffb68a" center style={{ marginHorizontal: 20, marginTop: 12 }}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 32 },
});
