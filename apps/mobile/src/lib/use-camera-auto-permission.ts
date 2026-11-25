import { useCameraPermissions } from "expo-camera";
import { useEffect } from "react";

/**
 * The camera permission, asked for straight away on the first visit (the screen's own "Allow camera"
 * button stays as the fallback). Not asked again once the user has answered.
 */
export function useCameraAutoPermission() {
  const [permission, requestPermission] = useCameraPermissions();
  useEffect(() => {
    if (permission && !permission.granted && permission.status === "undetermined" && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);
  return [permission, requestPermission] as const;
}
