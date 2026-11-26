import { CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useIsFocused } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Crown, Image as ImageIcon, Keyboard, X, Zap } from "lucide-react-native";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { AiLimitSheet } from "@/components/log/ai-limit-sheet";
import { cam, CAM_SUBTLE } from "@/components/log/camera/cam";
import { CameraSideButton, CameraTopButton, Shutter } from "@/components/log/camera/camera-buttons";
import { CameraBusy, CameraError, CameraPermission } from "@/components/log/camera/camera-overlays";
import { Corners } from "@/components/log/camera/corners";
import { ScanGuide } from "@/components/log/camera/scan-guide";
import { ScanHint } from "@/components/log/camera/scan-hint";
import { MealWhen } from "@/components/log/meal-when";
import { Text } from "@/components/ui";
import { Glow } from "@/components/ui/glow";
import { api, errorMessage } from "@/lib/api";
import { BARCODE_TYPES, barcodeInPhoto } from "@/lib/barcode-photo";
import { useMealChoice } from "@/lib/meal-param";
import { compressPhoto, uploadPhoto } from "@/lib/photo";
import { handlePremiumError, openPremium, usePremium } from "@/lib/premium";
import { usageQuery } from "@/lib/queries";
import { useCameraAutoPermission } from "@/lib/use-camera-auto-permission";
import { useLiveBarcode } from "@/lib/use-live-barcode";
import { useScanLimit } from "@/lib/use-scan-limit";
import { haptic } from "@/lib/haptics";

type Phase = "idle" | "checking" | "uploading" | "analysing";
type Photo = { uri: string; width: number; height: number };

const BUSY_LABEL: Record<Exclude<Phase, "idle">, string> = {
  checking: "Checking the photo…",
  uploading: "Uploading your photo…",
  analysing: "Reading your plate…",
};

/**
 * Screen 7: one camera, no modes. Point it at a packaged food's barcode and the product opens by
 * itself (read twice in a row, no shutter): exact label values, no AI scan used. A barcode found in
 * a photo works too. Anything else is a meal: shutter → compress → signed upload → AI → confirm.
 */
export default function CameraScreen() {
  const { mealType, setMealType, date, dateBody, params } = useMealChoice();
  // For the locked sheet's free path: type this meal instead, same slot and day.
  const logContext = { meal: mealType, date: date ?? undefined };
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraAutoPermission();
  const [ready, setReady] = useState(false);
  // The flash button keeps the torch on while framing (low light); off again when the screen closes.
  const [torch, setTorch] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const limit = useScanLimit();
  // A barcode the camera can see right now; a clear read opens its product by itself.
  const { seen, onBarcode } = useLiveBarcode(openProduct);
  const busy = phase !== "idle";
  // The camera keeps running under the product screen: only read barcodes while this screen shows.
  const focused = useIsFocused();
  // Free plan: barcode and photo scanning open the Premium screen instead.
  const premium = usePremium();
  const barcodeLocked = premium.locked("barcode");
  const photoLocked = premium.locked("photo_scan");
  const scans = useQuery({ ...usageQuery, enabled: premium.isPremium });

  /** The barcode path: the product screen asks for the meal and the portion. */
  function openProduct(code: string) {
    setPhase("idle");
    if (barcodeLocked) return openPremium("barcode", logContext);
    router.push({ pathname: "/log/barcode/[code]", params: { code, ...params } });
  }

  function fail(e: unknown) {
    setPhase("idle");
    if (handlePremiumError(e, logContext) || limit.catchLimit(e)) return;
    setError(errorMessage(e, "Something went wrong. Try again."));
  }

  /** Barcode in the photo → product; otherwise the AI reads the plate for the chosen meal. */
  async function route(photo: Photo) {
    setError(null);
    setPhase("checking");
    const code = await barcodeInPhoto(photo.uri);
    if (code) return openProduct(code);
    if (photoLocked) {
      setPhase("idle");
      return openPremium("photo_scan", logContext);
    }
    setPhase("uploading");
    try {
      const key = await uploadPhoto(await compressPhoto(photo));
      setPhase("analysing");
      const log = await api<{ id: string }>("/api/meals", {
        json: { source: "PHOTO", mealType, photoKey: key, ...dateBody },
      });
      router.replace(`/log/${log.id}`);
    } catch (e) {
      fail(e);
    }
  }

  async function shoot() {
    // A barcode in view wins: no photo, no upload, no scan used.
    if (seen) return openProduct(seen);
    if (photoLocked) return openPremium("photo_scan", logContext);
    if (!camera.current || !ready) return;
    try {
      haptic.press(); // the shutter
      const photo = await camera.current.takePictureAsync({ quality: 0.9 });
      if (photo) await route(photo);
    } catch (e) {
      fail(e);
    }
  }

  async function pickFromGallery() {
    if (photoLocked && barcodeLocked) return openPremium("photo_scan", logContext);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) await route(asset);
  }

  const granted = permission?.granted;
  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <CameraTopButton icon={X} label="Close" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="heading2" color={cam.white} numberOfLines={1}>
            Snap your meal
          </Text>
          {premium.isPremium && scans.data && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Crown size={12} color={cam.highlight} strokeWidth={2.4} absoluteStrokeWidth />
              <Text variant="labelMedium" color={CAM_SUBTLE} tabular>
                {scans.data.left} of {scans.data.limit} photo scans left today
              </Text>
            </View>
          )}
        </View>
        <CameraTopButton
          icon={Zap}
          iconSize={18}
          label="Flash"
          on={torch}
          disabled={!granted || !ready}
          onPress={() => setTorch((t) => !t)}
        />
      </View>

      <MealWhen tone="dark" mealType={mealType} onMealType={setMealType} date={date} />

      <View style={styles.viewfinder}>
        <LinearGradient colors={VIEWFINDER} style={StyleSheet.absoluteFill} />
        <Glow tone="aqua" opacity={0.6} left={12} bottom={-13} />
        {granted ? (
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch && focused}
            onCameraReady={() => setReady(true)}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={busy || !focused ? undefined : onBarcode}
          />
        ) : (
          <CameraPermission
            title={permission?.canAskAgain === false ? "Camera access is off" : "Allow the camera to snap your plate"}
            message={
              permission?.canAskAgain === false
                ? "Turn it on in Settings, or pick a photo from your gallery."
                : "Photos are only used to read your meal."
            }
            canAsk={permission?.canAskAgain !== false}
            onAllow={requestPermission}
          />
        )}
        {granted && <ScanGuide />}
        <Corners color={seen ? cam.highlight : undefined} />
        <ScanHint
          locked={photoLocked && barcodeLocked}
          seen={seen}
          onUnlock={() => openPremium("photo_scan", logContext)}
        />
        {phase !== "idle" && <CameraBusy label={BUSY_LABEL[phase]} />}
      </View>

      {error && <CameraError message={error} />}

      <View style={[styles.controls, { paddingBottom: Math.max(24, insets.bottom + 11) }]}>
        <CameraSideButton caption="Gallery" icon={ImageIcon} onPress={pickFromGallery} disabled={busy} />
        <View style={{ alignItems: "center", gap: 8 }}>
          <Shutter
            accessibilityLabel={seen ? `Look up barcode ${seen}` : "Take photo"}
            accessibilityHint={seen ? "Opens the product to pick how much you had" : undefined}
            onPress={shoot}
            disabled={busy || !granted || (!ready && !seen)}
            dimmed={busy || !granted}
            barcode={Boolean(seen)}
          />
          <Text variant="labelStrong" color={seen ? cam.highlight : cam.white}>
            {seen ? "Look up product" : "Snap"}
          </Text>
        </View>
        <CameraSideButton
          caption="Type"
          icon={Keyboard}
          onPress={() => router.replace({ pathname: "/log/type", params })}
        />
      </View>

      <AiLimitSheet {...limit.sheet} params={params} />
    </View>
  );
}

/** Figma "Viewfinder": the frame's own fill, seen until the camera feed draws over it. */
const VIEWFINDER = ["#2a2e33", "#121416"] as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: cam.panel, paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  viewfinder: { flex: 1, borderRadius: 28, overflow: "hidden" },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 16,
  },
});
