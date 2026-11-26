import { CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Image as ImageIcon } from "lucide-react-native";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AiLimitSheet } from "@/components/log/ai-limit-sheet";
import { cam } from "@/components/log/camera/cam";
import { CameraSideButton, CameraTopButton, Shutter } from "@/components/log/camera/camera-buttons";
import { CameraBusy, CameraError, CameraPermission } from "@/components/log/camera/camera-overlays";
import { Text } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { choiceParams, dayFromParam, mealFromParam } from "@/lib/meal-param";
import { compressPhoto, uploadPhoto } from "@/lib/photo";
import { handlePremiumError } from "@/lib/premium";
import { useCameraAutoPermission } from "@/lib/use-camera-auto-permission";
import { useScanLimit } from "@/lib/use-scan-limit";
import { haptic } from "@/lib/haptics";

/** Labels have small print, so keep more pixels than a plate photo. */
const LABEL_MAX_SIDE = 1600;

/** Screen 7f: dark camera with a tall frame for the nutrition table. Uses 1 photo scan. */
export default function LabelCamera() {
  const params = useLocalSearchParams<{ meal?: string; date?: string; barcode?: string; name?: string }>();
  // The meal and day are picked when the label values are checked; carry what's chosen so far.
  const choice = choiceParams(mealFromParam(params.meal), dayFromParam(params.date));
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraAutoPermission();
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "reading">("idle");
  const [error, setError] = useState<string | null>(null);
  const limit = useScanLimit();
  const busy = phase !== "idle";

  async function submit(photo: { uri: string; width: number; height: number }) {
    setError(null);
    setPhase("uploading");
    try {
      const photoKey = await uploadPhoto(await compressPhoto(photo, LABEL_MAX_SIDE, 0.88));
      setPhase("reading");
      const scan = await api<{ id: string }>("/api/foods/label", {
        json: { photoKey, barcode: params.barcode, name: params.name },
      });
      router.replace({ pathname: "/log/label/[id]", params: { id: scan.id, ...choice } });
    } catch (e) {
      setPhase("idle");
      if (handlePremiumError(e, choice) || limit.catchLimit(e)) return;
      setError(errorMessage(e, "Couldn't read the label. Try again."));
    }
  }

  async function shoot() {
    if (!camera.current || !ready) return;
    try {
      haptic.press(); // the shutter
      const photo = await camera.current.takePictureAsync({ quality: 0.95 });
      if (photo) await submit(photo);
    } catch {
      setError("Couldn't take the photo. Try again.");
    }
  }

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) await submit(asset);
  }

  const granted = permission?.granted;
  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <CameraTopButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
        <Text variant="heading2" color={cam.white}>
          Photograph the label
        </Text>
        {/* Balances the back button so the title stays centred. */}
        <View style={styles.spacer} />
      </View>

      <View style={styles.viewfinder}>
        {granted ? (
          <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} />
        ) : (
          <CameraPermission
            message="Allow the camera to photograph the label, or pick a photo from your gallery."
            canAsk={permission?.canAskAgain !== false}
            onAllow={requestPermission}
          />
        )}
        {/* Tall frame for the nutrition table. */}
        <View style={[styles.frame, { pointerEvents: "none" }]} />
        <View style={[styles.hint, { pointerEvents: "none" }]}>
          <Text variant="labelMedium" color={cam.white}>
            Whole table in frame · per 100 g visible
          </Text>
        </View>
        {busy && <CameraBusy label={phase === "uploading" ? "Uploading…" : "Reading the label…"} />}
      </View>

      {error && <CameraError message={error} />}

      <View style={[styles.controls, { paddingBottom: Math.max(28, insets.bottom + 8) }]}>
        <CameraSideButton icon={ImageIcon} accessibilityLabel="Pick from gallery" onPress={pick} disabled={busy} />
        <Shutter
          accessibilityLabel="Take photo of label"
          onPress={shoot}
          disabled={busy || !granted || !ready}
          dimmed={busy || !granted}
        />
        <View style={{ width: 56 }} />
      </View>

      <AiLimitSheet {...limit.sheet} params={choice} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: cam.panel },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  spacer: { width: 44, height: 44 },
  viewfinder: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#1c1f22",
  },
  frame: {
    position: "absolute",
    left: 40,
    right: 40,
    top: 24,
    bottom: 64,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    boxShadow: "0 0 0 999px rgba(23, 24, 28, 0.5)",
  },
  hint: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    borderRadius: 100,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 24,
  },
});
