import { Stack as NativeStack } from "expo-router";
import JSStack from "expo-router/js-stack";
import { Platform } from "react-native";

/**
 * The app's stack navigator. Phones use the native stack (real platform transitions, swipe back).
 * The web preview uses React Navigation's JS stack instead: the native stack has no transitions in
 * the browser, so screens hard-cut on open, back and close. The JS stack slides a screen in from the
 * right and back out on close, and lifts modals from the bottom (user decision 2026-11-27).
 * Options for both come from lib/motion (`stackMotion`, `modalMotion`), which pick the web variant.
 */
export const AppStack = (Platform.OS === "web" ? JSStack : NativeStack) as typeof NativeStack;
