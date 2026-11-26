import { Image } from "expo-image";
import { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Text } from "@/components/ui";
import { fonts } from "@/lib/theme";

/**
 * The three login slides (Figma "iPhone 13 & 14 - 25 / 26 / 16"): a photo under an olive tint, a
 * screenshot of the app in a rounded "phone", and a headline. Values are Figma's, in its 390 × 844
 * frame; `s` scales them to the phone.
 */
export const SLIDES = [
  {
    photo: require("../../../assets/login/slide1-photo.jpg"),
    photoH: 541,
    app: require("../../../assets/login/slide1-app.jpg"),
    appW: 190,
    title: "Know what you're actually eating.",
  },
  {
    photo: require("../../../assets/login/slide2-photo.jpg"),
    photoH: 542,
    app: require("../../../assets/login/slide2-app.jpg"),
    appW: 191,
    title: "See how far you've come.",
  },
  {
    photo: require("../../../assets/login/slide3-photo.jpg"),
    photoH: 543,
    app: require("../../../assets/login/slide3-app.jpg"),
    appW: 191,
    title: "Your goals deserve a smarter coach",
  },
] as const;

/** Auto-advance (user decision 2026-11-27: auto + swipe, looping). */
const AUTO_MS = 3500;
const SLIDE_MS = 520;
const EASE = Easing.inOut(Easing.cubic);
const SWIPE_FRACTION = 0.2;
const SWIPE_VELOCITY = 500;
/** The olive tint over every photo (Figma rgba(39, 48, 0, 0.6)). */
const TINT = "rgba(39,48,0,0.6)";
/** Headline colour as drawn (always-light screen). */
const TITLE_INK = "#151724";

/**
 * Slides in a looping row: pages 0, 1, 2 and a copy of 0, so slide 3 → 1 keeps moving forward; on
 * landing on the copy the row jumps back to 0 unseen. `pos` is the shared position in pages (the
 * dots read it). Swipe follows the finger; auto-advance waits for a quiet `AUTO_MS` after a touch.
 */
export function WelcomeSlides({ width, s, pos }: { width: number; s: number; pos: SharedValue<number> }) {
  const reduce = useReducedMotion();
  const start = useSharedValue(0);
  const w = useSharedValue(width);
  useEffect(() => {
    w.set(width);
  }, [width, w]);
  // Bumped on every touch; auto-advance skips a tick when it changed, so it waits after a swipe.
  const touches = useSharedValue(0);

  const settle = useCallback(
    (to: number) => {
      pos.set(
        withTiming(to, { duration: reduce ? 0 : SLIDE_MS, easing: EASE }, (done) => {
          // Landed on the copy of slide 1: jump back to the real one (same picture, no motion).
          if (done && to >= SLIDES.length) pos.set(0);
        }),
      );
    },
    [pos, reduce],
  );

  useEffect(() => {
    let seen = touches.get();
    const t = setInterval(() => {
      if (touches.get() !== seen) {
        seen = touches.get();
        return;
      }
      settle(Math.round(pos.get()) + 1);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [settle, pos, touches]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-14, 14])
        .onStart(() => {
          start.set(pos.get());
          touches.set(touches.get() + 1);
        })
        .onUpdate((e) => {
          let p = start.get() - e.translationX / w.get();
          // Before slide 1 there's nothing: a little give, then back.
          if (p < 0) p *= 0.2;
          pos.set(Math.min(SLIDES.length, p));
        })
        .onEnd((e) => {
          const from = Math.round(start.get());
          const moved = pos.get() - from;
          let to = from;
          if (moved > SWIPE_FRACTION || e.velocityX < -SWIPE_VELOCITY) to = from + 1;
          else if (moved < -SWIPE_FRACTION || e.velocityX > SWIPE_VELOCITY) to = from - 1;
          to = Math.max(0, Math.min(SLIDES.length, to));
          scheduleOnRN(settle, to);
          touches.set(touches.get() + 1);
        }),
    [pos, start, w, settle, touches],
  );

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: -pos.get() * w.get() }] }));
  const pages = [...SLIDES, SLIDES[0]];

  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.row, { width: width * pages.length }, row]}>
          {pages.map((slide, i) => (
            <View
              key={i}
              style={[styles.page, { left: i * width, width }]}
              // The copy of slide 1 is only for the loop; screen readers skip it.
              importantForAccessibility={i === SLIDES.length ? "no-hide-descendants" : "auto"}
              accessibilityElementsHidden={i === SLIDES.length}
            >
              <View style={{ height: slide.photoH * s }}>
                <Image
                  source={slide.photo}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  accessibilityIgnoresInvertColors
                />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: TINT }]} />
              </View>
              {/* The app in a rounded "phone": Figma crops the screenshot's status bar (top 3.4 %). */}
              <View
                style={[
                  styles.app,
                  {
                    top: 173 * s,
                    left: width / 2 - (slide.appW / 2) * s,
                    width: slide.appW * s,
                    height: 420 * s,
                    borderRadius: 16 * s,
                  },
                ]}
              >
                <Image
                  source={slide.app}
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "100%",
                    top: -0.034 * 420 * s,
                    height: 1.034 * 420 * s,
                  }}
                  contentFit="fill"
                  accessibilityLabel={`FITR8 screen: ${slide.title}`}
                />
              </View>
              <Text
                accessibilityRole="header"
                color={TITLE_INK}
                style={[
                  styles.title,
                  { top: 622 * s, left: width / 2 - 200 * s, width: 400 * s, fontSize: 20 * s, lineHeight: 24 * s },
                ]}
                numberOfLines={1}
              >
                {slide.title}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

/** Figma "Frame 18": three 10 px dots 6 apart; the active one solid olive, the others 20 % (user: olive, not purple). */
export function SlideDots({ pos, s }: { pos: SharedValue<number>; s: number }) {
  return (
    <View
      style={{ flexDirection: "row", gap: 6 * s }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {SLIDES.map((_, i) => (
        <Dot key={i} i={i} pos={pos} size={10 * s} />
      ))}
    </View>
  );
}

function Dot({ i, pos, size }: { i: number; pos: SharedValue<number>; size: number }) {
  const style = useAnimatedStyle(() => {
    const p = pos.get();
    // How much this dot is "the current one": 1 on its slide, fading as the row moves away; slide 1
    // also lights up as the loop's copy comes in.
    const on = Math.max(0, 1 - Math.abs(p - i)) + (i === 0 ? Math.max(0, 1 - Math.abs(p - SLIDES.length)) : 0);
    return { opacity: 0.2 + 0.8 * Math.min(1, on) };
  });
  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#718b00" }, style]} />
  );
}

const styles = StyleSheet.create({
  row: { position: "absolute", top: 0, bottom: 0, left: 0 },
  page: { position: "absolute", top: 0, bottom: 0, backgroundColor: "#ffffff" },
  app: { position: "absolute", overflow: "hidden", backgroundColor: "#f4f3f9" },
  title: { position: "absolute", fontFamily: fonts.sans500, color: TITLE_INK, textAlign: "center" },
});
