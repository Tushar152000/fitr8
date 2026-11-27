import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Wordmark } from "@/components/brand/wordmark";
import { SignInSheet, type SignInMode } from "@/components/login/sign-in-sheet";
import { SlideDots, WelcomeSlides } from "@/components/login/welcome-slides";
import { MovingGradient, PressableScale, Text } from "@/components/ui";
import { fonts } from "@/lib/theme";

/** Figma frame size the layout is drawn in; everything scales by `s` to the phone. */
const FRAME_W = 390;
const FRAME_H = 844;
/** "Log In" ink as drawn (always-light screen). */
const LOGIN_INK = "#050600";

/**
 * Login (Figma "iPhone 13 & 14 - 25 / 26 / 16", user decisions 2026-11-27): three sliding slides
 * (photo, the app, a headline; auto + swipe, looping) under a fixed wordmark, olive page dots, the
 * moving-gradient "Sign Up For Free" pill and "Log In". Both buttons open the same sign-in sheet. Always
 * light, whatever the phone's theme. Drawn on Figma's 390 × 844 frame and scaled to fit the screen
 * (width first, then height), centred, so it matches the design on every phone.
 */
export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const s = Math.min(width / FRAME_W, height / FRAME_H);
  const pos = useSharedValue(0);
  const [sheet, setSheet] = useState<SignInMode | null>(null);
  const centre = (w: number) => width / 2 - (w / 2) * s;

  return (
    <View style={styles.root}>
      {/* White status-bar icons over the photos. */}
      <StatusBar style="light" />
      <WelcomeSlides width={width} s={s} pos={pos} />

      <View style={[styles.abs, { top: 105 * s, left: centre(185) }]} pointerEvents="none">
        <Wordmark color="#ffffff" width={185 * s} />
      </View>

      <View style={[styles.abs, { top: (622 + 24 + 14) * s, left: centre(42) }]} pointerEvents="none">
        <SlideDots pos={pos} s={s} />
      </View>

      <View
        style={[styles.abs, { top: (622 + 24 + 14 + 10 + 32) * s, left: centre(325), width: 325 * s, gap: 10 * s }]}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Sign up for free"
          onPress={() => setSheet("signup")}
          style={[styles.pill, { height: 48 * s }]}
        >
          <MovingGradient width={325 * s} height={48 * s} motion="flow" />
          <Text style={[styles.buttonLabel, { fontSize: 16 * s, lineHeight: 20 * s }]} color="#ffffff">
            Sign Up For Free
          </Text>
        </PressableScale>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log in"
          onPress={() => setSheet("login")}
          hitSlop={6}
          style={({ pressed }) => [styles.login, { paddingVertical: 10 * s }, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.buttonLabel, { fontSize: 16 * s, lineHeight: 20 * s }]} color={LOGIN_INK}>
            Log In
          </Text>
        </Pressable>
      </View>

      <SignInSheet mode={sheet} onClose={() => setSheet(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff", overflow: "hidden" },
  abs: { position: "absolute" },
  pill: { borderRadius: 100, overflow: "hidden", alignItems: "center", justifyContent: "center", width: "100%" },
  // Figma: Roboto Bold 16, tracking 0.1; the app's type is Inter, so Inter Bold.
  buttonLabel: { fontFamily: fonts.sans700, letterSpacing: 0.1 },
  login: { alignItems: "center", justifyContent: "center" },
});
