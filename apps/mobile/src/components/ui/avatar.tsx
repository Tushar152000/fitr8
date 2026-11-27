import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { PRIMARY_PILL } from "@/lib/gradients";
import { makeStyles, useColors } from "@/lib/theme";
import { Text } from "./text";

/**
 * Figma "Avatar": a round photo, or the first letter of the name when there's no photo (or it fails
 * to load). `variant` styles the letter: `soft` = olive on accent-subtle (Profile header),
 * `primary` = white on gradient/primary (Home header). The letter is Inter SemiBold at 36 % of
 * `size` (64 → 23.3). Pass `me.image` as `image`: it is the uploaded photo's signed URL or the
 * sign-in picture; the signed URL changes per /me call, so it is cached by its path.
 */
export function Avatar({
  name,
  image,
  size = 44,
  variant = "soft",
  style,
}: {
  /** Display name or email; its first letter is the fallback. */
  name: string | null | undefined;
  image?: string | null;
  size?: number;
  variant?: "soft" | "primary";
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const styles = useStyles();
  const [failed, setFailed] = useState<string | null>(null);
  const round = { width: size, height: size, borderRadius: size / 2 };
  const letter = (name?.trim() || "?").charAt(0).toUpperCase();
  const showPhoto = Boolean(image) && failed !== image;

  const initial = (
    <Text
      variant="heading1"
      size={Math.round(size * 0.3636 * 100) / 100}
      color={variant === "primary" ? c.white : c.brandText}
    >
      {letter}
    </Text>
  );

  // Two layers so it's a true circle everywhere: the outer one carries the shadow (a shadow on a
  // clipping view is cut off on iOS and can draw square on Android), the inner one clips to round.
  return (
    <View style={[round, styles.shadow, style]}>
      <View
        style={[
          round,
          styles.clip,
          !showPhoto && styles.center,
          !showPhoto && variant === "soft" && { backgroundColor: c.brandSoft },
        ]}
      >
        {showPhoto ? (
          <Image
            source={{ uri: image!, cacheKey: image!.split("?")[0] }}
            style={round}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
            onError={() => setFailed(image!)}
          />
        ) : (
          <>
            {variant === "primary" && <LinearGradient {...PRIMARY_PILL} style={StyleSheet.absoluteFill} />}
            {initial}
          </>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  shadow: { backgroundColor: c.track, ...shadows.card },
  clip: { overflow: "hidden", backgroundColor: c.track },
  center: { alignItems: "center", justifyContent: "center" },
}));
