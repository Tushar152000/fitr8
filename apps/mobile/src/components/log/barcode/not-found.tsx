import { router } from "expo-router";
import { BadgeCheck, Camera, SearchX } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Button, FormField, Screen, Text, TextField } from "@/components/ui";
import { openPremium, usePremium } from "@/lib/premium";
import { makeStyles, useColors } from "@/lib/theme";
import { TipsCard } from "../tips-card";
import { BackRow } from "./back-row";

/** Why the lookup came back empty: not in any database, not a valid code, or the database didn't answer. */
export type NotFoundReason = "unknown" | "invalid" | "unreachable";

const TIPS = [
  "Get the whole nutrition table in frame",
  "Include the per 100 g column",
  "Tilt away from lights to avoid glare",
  "Uses 1 photo scan",
];

/** Design 7e: unknown (or invalid) barcode → photograph the label, or type the meal. */
export function NotFound({
  known,
  code,
  choice,
  reason,
}: {
  /** What a product database knew without the nutrition. */
  known: { name: string; brand: string | null; imageUrl: string | null } | null;
  code: string;
  /** Meal and day picked so far, carried to the label or typing screen. */
  choice: { meal?: string; date?: string };
  reason: NotFoundReason;
}) {
  const labelLocked = usePremium().locked("label_scan");
  const c = useColors();
  const styles = useStyles();
  const [name, setName] = useState(
    known ? (known.brand && !known.name.includes(known.brand) ? `${known.name} (${known.brand})` : known.name) : "",
  );
  const title =
    reason === "invalid"
      ? "That barcode didn't read right"
      : reason === "unreachable"
        ? "We couldn't check this product"
        : known
          ? "We know it, but not its nutrition"
          : "We don't know this product yet";

  return (
    <Screen
      footer={
        <>
          <Button
            icon={Camera}
            onPress={() =>
              labelLocked
                ? openPremium("label_scan", choice)
                : router.push({
                    pathname: "/log/label",
                    params: { ...choice, barcode: code, ...(name.trim() ? { name: name.trim() } : {}) },
                  })
            }
          >
            Photograph the label
          </Button>
          <Button variant="secondary" onPress={() => router.replace({ pathname: "/log/type", params: choice })}>
            Type it instead
          </Button>
        </>
      }
    >
      <BackRow />
      <View style={{ gap: 8 }}>
        <View style={styles.searchX}>
          <SearchX size={22} color={c.ink} strokeWidth={2} />
        </View>
        <Text variant="heading1" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="bodySm" color={c.ink2}>
          {reason === "invalid"
            ? "Scan it again, or photograph the nutrition label instead."
            : reason === "unreachable"
              ? "The product database didn't answer. Photograph the label, or try again in a minute."
              : known
                ? `${known.name}${known.brand ? ` · ${known.brand}` : ""}. Photograph its nutrition label once and it's saved for everyone.`
                : "Photograph its nutrition label once and it's saved for everyone."}
        </Text>
        {reason !== "invalid" && (
          <Text variant="labelRegular" color={c.ink3} tabular>
            Barcode {code}
          </Text>
        )}
      </View>
      <TipsCard title="For a good label photo" tips={TIPS} icon={BadgeCheck} />
      <FormField label="Product name (optional)" gap={6}>
        <TextField
          accessibilityLabel="Product name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Parle-G Gold"
        />
      </FormField>
    </Screen>
  );
}

const useStyles = makeStyles((c, shadows) => ({
  searchX: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: c.surface,
    marginBottom: 4,
    ...shadows.card,
    alignItems: "center",
    justifyContent: "center",
  },
}));
