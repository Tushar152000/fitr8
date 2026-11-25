import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Linking, Platform } from "react-native";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirmAction } from "@/lib/confirm";
import { compressPhoto, uploadPhoto } from "@/lib/photo";
import { showToast } from "@/lib/toast";

/** Profile photos are shown at most 64 pt (×3 on the densest phones): 512 px is plenty. */
const AVATAR_SIDE = 512;

/** Taking a photo needs a camera (not the web preview). */
export const canTakePhoto = Platform.OS !== "web";

/**
 * Profile photo: pick (square crop) or take one, compress it like meal photos, upload it through
 * a signed URL (POST /api/profile/photo/upload-url → PUT), then PUT /api/profile/photo; or remove
 * it. Refreshes `me` so every avatar updates.
 */
export function useProfilePhoto() {
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);

  async function save(asset: ImagePicker.ImagePickerAsset) {
    setBusy(true);
    try {
      const uri = await compressPhoto(asset, AVATAR_SIDE);
      const key = await uploadPhoto(uri, "/api/profile/photo/upload-url");
      await api("/api/profile/photo", { method: "PUT", json: { key } });
      await refresh();
      showToast("Photo updated");
    } catch (e) {
      showToast(errorMessage(e, "Couldn't update your photo. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function choose() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) await save(result.assets[0]);
  }

  async function take() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      if (
        !permission.canAskAgain &&
        (await confirmAction(
          "Camera is off for FITR8",
          "Allow the camera in your phone's Settings to take a profile photo.",
          "Open Settings",
        ))
      )
        await Linking.openSettings();
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets[0]) await save(result.assets[0]);
  }

  async function remove() {
    setBusy(true);
    try {
      await api("/api/profile/photo", { method: "DELETE" });
      await refresh();
      showToast("Photo removed");
    } catch (e) {
      showToast(errorMessage(e, "Couldn't remove your photo. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return { busy, choose, take, remove };
}
