import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Whether the on-screen keyboard is up. iOS reports it as it starts to move ("will"), Android once
 * it's shown ("did"), so a composer can drop its home-indicator gap and sit right on the keyboard.
 */
export function useKeyboardVisible(onShow?: () => void): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", () => {
      setVisible(true);
      onShow?.();
    });
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [onShow]);
  return visible;
}

/** The on-screen keyboard's height (0 when hidden), so a panel can size itself to the space above it. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
