import {
  bannerHidden,
  bannerTooEarly,
  dismissBanner,
  NO_DISMISSALS,
  type BannerDismissals,
} from "@/lib/premium-banner";
import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Text } from "@/components/ui";
import { PhotoDemo } from "./photo-demo";
import { SmallCta } from "./small-cta";
import { track } from "@/lib/analytics";
import { useMe } from "@/lib/auth";
import { localYmd } from "@/lib/meal-param";
import { LIST_PRICE, openPaywall } from "@/lib/premium";
import { usageQuery } from "@/lib/queries";
import { makeStyles, radius, useColors } from "@/lib/theme";
import Animated from "react-native-reanimated";
import { appear, disappear } from "@/lib/motion";

const KEY = (userId: string) => `fitr8.premium.banner.${userId}`;

async function read(userId: string): Promise<BannerDismissals> {
  try {
    const raw =
      Platform.OS === "web"
        ? globalThis.localStorage?.getItem(KEY(userId))
        : await SecureStore.getItemAsync(KEY(userId));
    return raw ? (JSON.parse(raw) as BannerDismissals) : NO_DISMISSALS;
  } catch {
    return NO_DISMISSALS;
  }
}

async function write(userId: string, d: BannerDismissals) {
  try {
    const raw = JSON.stringify(d);
    if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY(userId), raw);
    else await SecureStore.setItemAsync(KEY(userId), raw);
  } catch {
    // Worst case the banner shows again today.
  }
}

/**
 * Design 14: on Today, for free users only. Personal ("You typed 3 meals today") and easy to
 * dismiss. Redesigned 2026-11-28 (user: "too much"): a title, then the difference side by side
 * as a looping animation (`PhotoDemo`: typing crawls vs a photo scan finding every food) and one
 * button "Try photo logging" — no paragraph, no feature chips. Dismiss: ✕ hides it for the day; hidden 3 days in a row, it rests for a week.
 * Never in the first 3 days after sign-up.
 */
export function PremiumBanner() {
  const me = useMe();
  const c = useColors();
  const styles = useStyles();
  const usage = useQuery(usageQuery);
  const onboardedAt = me.profile?.onboardedAt;
  // Read once per mount: this phone's dismissals, today's date and whether the account is new.
  const [state, setState] = useState<{ dismissals: BannerDismissals; today: string; newUser: boolean } | null>(null);
  useEffect(() => {
    const newUser = bannerTooEarly(onboardedAt, new Date());
    void read(me.id).then((dismissals) => setState({ dismissals, today: localYmd(), newUser }));
  }, [me.id, onboardedAt]);

  const typed = usage.data?.typedMeals?.today ?? 0;
  const visible =
    usage.data?.plan === "FREE" && state !== null && !state.newUser && !bannerHidden(state.dismissals, state.today);

  const shown = useRef(false);
  useEffect(() => {
    if (visible && !shown.current) {
      shown.current = true;
      track("premium_banner_shown", { meals_typed_today: typed });
    }
  }, [visible, typed]);

  if (!visible) return null;

  async function dismiss() {
    track("premium_banner_dismissed", { meals_typed_today: typed });
    if (!state) return;
    const next = dismissBanner(state.dismissals, state.today);
    setState({ ...state, dismissals: next });
    await write(me.id, next);
  }

  return (
    <Animated.View entering={appear} exiting={disappear} style={styles.banner}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Text variant="heading3" style={{ flex: 1 }}>
          {typed > 0 ? `You typed ${typed} ${typed === 1 ? "meal" : "meals"} today` : "Snap instead of typing"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hide Premium banner for today"
          onPress={dismiss}
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
        >
          <X size={18} color={c.ink3} />
        </Pressable>
      </View>

      {/* The difference, shown not told: typing crawls, a photo finds everything at once. */}
      <PhotoDemo />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text variant="labelMedium" color={c.ink2} tabular style={{ flex: 1 }}>
          From {LIST_PRICE.perMonth} a month
        </Text>
        <SmallCta
          label="Try photo logging"
          onPress={() => {
            track("premium_banner_tapped", { meals_typed_today: typed });
            openPaywall("home_banner");
          }}
        />
      </View>
    </Animated.View>
  );
}

// Restyled to the Figma "New" cards (2026-11-26): white card with Elevation/Card, gradient icon tile.
const useStyles = makeStyles((c, shadows) => ({
  banner: {
    gap: 14,
    padding: 20,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    ...shadows.card,
  },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center", margin: -10 },
}));
