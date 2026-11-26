import { useEffect, useState, type ReactElement } from "react";
import { Platform, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Nav = {
  addListener: (event: "focus", cb: () => void) => () => void;
  canGoBack: () => boolean;
};

const PUSH_MS = 260;
const easeOut = Easing.out(Easing.cubic);

/**
 * Web only: the native stack has no transitions in the browser (screens just swap `display`), so the
 * web preview cut hard between screens. This plays the stack motion there: a pushed screen slides in
 * from the right and fades up; going back, the screen underneath eases in from the left; a modal
 * (`presentation: "modal"`) rises from the bottom. Phones keep the real native transition
 * (lib/motion `stackMotion`), so this renders its children untouched there.
 */
export function ScreenTransition({
  navigation,
  modal,
  children,
}: {
  navigation: Nav;
  modal?: boolean;
  children: ReactElement;
}) {
  if (Platform.OS !== "web") return children;
  return (
    <WebTransition navigation={navigation} modal={modal}>
      {children}
    </WebTransition>
  );
}

function WebTransition({ navigation, modal, children }: { navigation: Nav; modal?: boolean; children: ReactElement }) {
  const reduce = useReducedMotion(); // read synchronously, so the mount animation sees it
  // A screen pushed onto the stack mounts already focused (its focus event fires before an effect
  // could listen), so it starts off-stage and animates in on mount. The app's first screen doesn't.
  const [pushed] = useState(() => navigation.canGoBack());
  const x = useSharedValue(pushed && !modal ? 32 : 0);
  const y = useSharedValue(pushed && modal ? 48 : 0);
  const opacity = useSharedValue(pushed ? 0 : 1);

  useEffect(() => {
    const t = { duration: reduce ? 0 : PUSH_MS, easing: easeOut };
    x.set(withTiming(0, t));
    y.set(withTiming(0, t));
    opacity.set(withTiming(1, { duration: reduce ? 0 : 220, easing: easeOut }));
    let mounted = false;
    const off = navigation.addListener("focus", () => {
      // The mount's own focus (if it arrives late) is not a "back".
      if (!mounted) return;
      if (reduce) return;
      x.set(-24);
      x.set(withTiming(0, t));
      opacity.set(0.6);
      opacity.set(withTiming(1, { duration: 180, easing: easeOut }));
    });
    // Focus events from now on mean the screen above was closed (going back).
    const id = setTimeout(() => {
      mounted = true;
    }, 0);
    return () => {
      clearTimeout(id);
      off();
    };
    // Runs once per screen: later focus changes come through the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: x.get() }, { translateY: y.get() }],
  }));
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
