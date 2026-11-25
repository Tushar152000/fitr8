import { CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useIsFocused } from "expo-router";
import { Crown, Images, Keyboard, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { AiLimitSheet } from "@/components/log/ai-limit-sheet";
import { cam } from "@/components/log/camera/cam";
import { CameraSideButton, CameraTopButton, Shutter } from "@/components/log/camera/camera-buttons";
import { CameraBusy, CameraError, CameraPermission } from "@/components/log/camera/camera-overlays";
import { Corners } from "@/components/log/camera/corners";
import { ScanHint } from "@/components/log/camera/scan-hint";
import { MealWhen } from "@/components/log/meal-when";
import { Text } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { BARCODE_TYPES, barcodeInPhoto } from "@/lib/barcode-photo";
import { useMealChoice } from "@/lib/meal-param";
import { compressPhoto, uploadPhoto } from "@/lib/photo";
import { handlePremiumError, openPremium, usePremium } from "@/lib/premium";
import { usageQuery } from "@/lib/queries";
import { radius } from "@/lib/theme";
import { useCameraAutoPermission } from "@/lib/use-camera-auto-permission";
import { useLiveBarcode } from "@/lib/use-live-barcode";
import { useScanLimit } from "@/lib/use-scan-limit";

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
      <View style={styles.top}>
        <CameraTopButton icon={X} label="Close" onPress={() => router.back()} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight={600} color={cam.white}>
            Snap your meal
          </Text>
          {premium.isPremium && scans.data && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Crown size={12} color={cam.brandGlow} />
              <Text size={12} weight={600} color="rgba(255,255,255,0.75)" tabular>
                {scans.data.left} of {scans.data.limit} photo scans left today
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ paddingTop: 8, paddingBottom: 12 }}>
        <MealWhen tone="dark" gutter={20} mealType={mealType} onMealType={setMealType} date={date} />
      </View>

      <View style={styles.viewfinder}>
        {granted ? (
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
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
        <Corners color={seen ? cam.proteinSoft : undefined} />
        <ScanHint
          locked={photoLocked && barcodeLocked}
          seen={seen}
          onUnlock={() => openPremium("photo_scan", logContext)}
        />
        {phase !== "idle" && <CameraBusy label={BUSY_LABEL[phase]} />}
      </View>

      {error && <CameraError message={error} />}

      <View style={[styles.controls, { paddingBottom: Math.max(28, insets.bottom + 16) }]}>
        <CameraSideButton caption="Gallery" icon={Images} onPress={pickFromGallery} disabled={busy} />
        <View style={{ alignItems: "center", gap: 6 }}>
          <Shutter
            accessibilityLabel={seen ? `Look up barcode ${seen}` : "Take photo"}
            accessibilityHint={seen ? "Opens the product to pick how much you had" : undefined}
            onPress={shoot}
            disabled={busy || !granted || (!ready && !seen)}
            dimmed={busy || !granted}
            barcode={Boolean(seen)}
          />
          <Text weight={600} size={12} color={seen ? cam.proteinSoft : "rgba(255,255,255,0.85)"}>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: cam.panel },
  top: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
  viewfinder: {
    marginHorizontal: 20,
    marginTop: 16,
    aspectRatio: 3 / 4,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  controls: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
});
