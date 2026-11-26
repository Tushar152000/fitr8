import "@/lib/web-pointer-fix";
import "@/lib/web-styles";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, ThemeProvider, useSegments } from "expo-router";
import { AppStack } from "@/components/app-stack";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { WifiOff } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button, Text } from "@/components/ui";
import { OfflineBanner } from "@/components/offline-banner";
import { trackScreen } from "@/lib/analytics";
import { AuthProvider, useAuth } from "@/lib/auth";
import { queryClient, wireQueryLifecycle } from "@/lib/query";
import { configureNotifications } from "@/lib/reminders";
import { AppearanceProvider, palettes, useColors, useScheme } from "@/lib/theme";
import { PremiumLockedSheet } from "@/components/premium/locked-sheet";
import { Toast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CoverScreen } from "@/components/brand/cover-screen";
import { modalMotion, stackBackground, stackMotion } from "@/lib/motion";

SplashScreen.preventAutoHideAsync();
// Finishes the sign-in popup when the web preview is used.
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  useEffect(() => wireQueryLifecycle(), []);
  useEffect(() => {
    configureNotifications().catch(() => {});
  }, []);

  return (
    // Gestures (the day swipe on Today) need the handler root at the top of the tree.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppearanceProvider>
            <NavigationTheme>
              <AuthProvider>
                {fontsLoaded && <Routes />}
                <OfflineBanner />
                <PremiumLockedSheet />
                <Toast />
                <ConfirmDialog />
                {/* Over everything until the session is known; the native splash hides behind it. */}
                <Cover fontsLoaded={fontsLoaded} />
              </AuthProvider>
            </NavigationTheme>
          </AppearanceProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The Figma cover (components/brand/cover-screen.tsx) from launch until fonts are loaded and the
 * session is checked. The native splash hides as soon as the cover has drawn, so there's no flash.
 */
function Cover({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useAuth();
  return (
    <CoverScreen
      ready={fontsLoaded && status !== "loading"}
      onShown={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    />
  );
}

/**
 * React Navigation's own colours (screen card, transitions, modal backdrop) from our palette, so no
 * screen flashes white in dark mode.
 */
function NavigationTheme({ children }: { children: ReactNode }) {
  const scheme = useScheme();
  const c = palettes[scheme];
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: c.brandText,
      background: c.ground,
      card: c.surface,
      text: c.ink,
      border: c.line,
      notification: c.brand,
    },
  };
  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
}

/**
 * Signed out → login; signed in but not onboarded → onboarding only; onboarded but away 90+ days →
 * the welcome-back check-in; otherwise the app. A returning user who signs in again never repeats
 * onboarding.
 */
function Routes() {
  const { status, me } = useAuth();
  const c = useColors();
  // Route pattern (e.g. "log/[id]"), never ids; groups like "(tabs)" dropped.
  const screen = useSegments()
    .filter((s) => !s.startsWith("("))
    .join("/");
  useEffect(() => {
    if (status === "signedIn" || status === "signedOut") trackScreen(screen || "index");
  }, [screen, status]);
  if (status === "loading") return null;
  if (status === "offline") return <OfflineStart />;

  const signedIn = status === "signedIn";
  const onboarded = Boolean(me?.onboarded);
  // Back after 90+ days: only the welcome-back check-in until it's answered or dismissed.
  const welcomeBack = onboarded && Boolean(me?.welcomeBack);
  return (
    <AppStack screenOptions={{ headerShown: false, ...stackBackground(c.ground), ...stackMotion }}>
      {/*
        Order matters: when a guard flips (sign-in, sign-out), the stack falls back to the FIRST screen
        still allowed. The app must come before onboarding, or a returning user who signs in again
        lands on the (prefilled) edit-goal form instead of Today.
      */}
      <AppStack.Protected guard={!signedIn}>
        <AppStack.Screen name="login" />
      </AppStack.Protected>
      <AppStack.Protected guard={signedIn && welcomeBack}>
        <AppStack.Screen name="welcome-back" />
      </AppStack.Protected>
      <AppStack.Protected guard={signedIn && onboarded && !welcomeBack}>
        <AppStack.Screen name="(tabs)" />
        <AppStack.Screen name="log" />
        <AppStack.Screen name="briefing" />
        <AppStack.Screen name="progress" />
        <AppStack.Screen name="goal" />
        <AppStack.Screen name="coach" />
        <AppStack.Screen name="coach-memory" />
        <AppStack.Screen name="reminders" />
        <AppStack.Screen name="measurements" />
        <AppStack.Screen name="workout-session" />
        <AppStack.Screen name="training/[date]" />
        <AppStack.Screen name="training/setup" />
        <AppStack.Screen name="profile" />
        <AppStack.Screen name="health/index" />
        <AppStack.Screen name="health/connect" />
        <AppStack.Screen name="settings/index" />
        <AppStack.Screen name="settings/account" />
        <AppStack.Screen name="settings/notifications" />
        <AppStack.Screen name="settings/privacy" />
        <AppStack.Screen name="support/index" />
        <AppStack.Screen name="support/faq" />
        <AppStack.Screen name="support/feedback" />
        <AppStack.Screen name="pro" options={modalMotion} />
      </AppStack.Protected>
      {/* First-time setup, and where an onboarded user edits their goal (pushed from Profile). */}
      <AppStack.Protected guard={signedIn}>
        <AppStack.Screen name="onboarding" />
      </AppStack.Protected>
    </AppStack>
  );
}

/** A saved session but no connection at launch: keep the session and let the user retry. */
function OfflineStart() {
  const { retry } = useAuth();
  const [busy, setBusy] = useState(false);
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.ground, justifyContent: "center", padding: 24, gap: 16 }}>
      <WifiOff size={32} color={c.ink3} />
      <Text variant="h1">You&apos;re offline</Text>
      <Text color={c.ink2}>FITR8 couldn&apos;t reach the server. Check your connection and try again.</Text>
      <Button
        loading={busy}
        onPress={async () => {
          setBusy(true);
          await retry();
          setBusy(false);
        }}
      >
        Try again
      </Button>
    </View>
  );
}
