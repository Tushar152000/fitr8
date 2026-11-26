import { Platform } from "react-native";

/**
 * Web only: react-native-gesture-handler (2.32, web/tools/PointerEventManager) releases pointer
 * capture on every pointer-up, even when the browser already dropped it (a swipe that ends off the
 * element, a screen that moved under the finger). Firefox then throws "Element.releasePointerCapture:
 * Invalid pointer id" as an uncaught error. Releasing a capture that isn't held is harmless, so skip it.
 */
if (Platform.OS === "web" && typeof Element !== "undefined") {
  const release = Element.prototype.releasePointerCapture;
  Element.prototype.releasePointerCapture = function (this: Element, pointerId: number) {
    if (!this.hasPointerCapture(pointerId)) return;
    try {
      release.call(this, pointerId);
    } catch {
      // The pointer went away between the check and the call.
    }
  };
}
