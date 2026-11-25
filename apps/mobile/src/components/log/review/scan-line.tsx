import { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";
import { NATIVE_DRIVER, useReduceMotion } from "@/lib/motion";
import { makeStyles } from "@/lib/theme";

/** Design 8: animated scan line over the photo. */
export function ScanLine({ height }: { height: number }) {
  const styles = useStyles();
  const reduce = useReduceMotion();
  const [y] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const ease = Easing.inOut(Easing.ease);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1600, easing: ease, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(y, { toValue: 0, duration: 1600, easing: ease, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [reduce, y]);
  // Design 8: no scan line under Reduce Motion.
  if (reduce) return null;
  return (
    <Animated.View
      aria-hidden
      style={[
        styles.scan,
        { transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, height - 2] }) }] },
      ]}
    />
  );
}

const useStyles = makeStyles((c) => ({
  scan: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: c.brandGlow,
    boxShadow: "0 0 16px 4px rgba(232, 119, 46, 0.6)",
  },
}));
