import type { SavedMealDto, UsualDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Info, X } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MealWhen } from "@/components/log/meal-when";
import { ModeTabs } from "@/components/log/mode-tabs";
import { SavedMealsSection, UsualsSection } from "@/components/log/quick-log-lists";
import { Button, FieldError, PressableScale, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { useMealChoice } from "@/lib/meal-param";
import { savedMealsQuery } from "@/lib/queries";
import { queryClient, refreshDay } from "@/lib/query";
import { fonts, makeStyles, radius, useColors } from "@/lib/theme";
import { showDay } from "@/lib/view-day";
import { haptic } from "@/lib/haptics";

/** Screen 7b: type what you ate, or relog a usual with one tap. Typing never uses a photo scan. */
export default function TypeMealScreen() {
  const c = useColors();
  const styles = useStyles();
  const { mealType, mealChosen, setMealType, date, dateBody, params } = useMealChoice();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // "text", a usual's mealId or a saved meal's id
  const [error, setError] = useState<string | null>(null);
  const usuals = useQuery({
    queryKey: ["usuals"],
    queryFn: () => api<{ usuals: UsualDto[] }>("/api/meals/usuals").then((r) => r.usuals),
  });
  const saved = useQuery(savedMealsQuery);

  async function submit() {
    const value = text.trim();
    setError(null);
    if (value.length < 2) return setError("Tell us what you ate, e.g. 2 roti and 1 katori dal");
    setBusy("text");
    try {
      const log = await api<{ id: string }>("/api/meals", {
        json: { source: "TEXT", mealType, text: value, ...dateBody },
      });
      router.replace(`/log/${log.id}`);
    } catch (err) {
      setError(errorMessage(err, "Couldn't read that. Try again."));
      setBusy(null);
    }
  }

  async function relog(u: UsualDto) {
    setBusy(u.mealId);
    setError(null);
    try {
      await api("/api/meals/relog", { json: { mealId: u.mealId, mealType, ...dateBody } });
      track("meal_logged", { method: "usual" });
      haptic.success();
      refreshDay();
      showDay(date);
      router.dismissTo("/today");
    } catch (err) {
      setError(errorMessage(err, "Couldn't add that. Try again."));
      setBusy(null);
    }
  }

  /** One tap: the picked meal, else the slot the user saved it for, else the one for the time of day. */
  async function logSaved(m: SavedMealDto) {
    const slot = mealChosen ? mealType : (m.mealType ?? mealType);
    setBusy(m.id);
    setError(null);
    try {
      await api(`/api/saved-meals/${m.id}/log`, { json: { mealType: slot, ...dateBody } });
      track("meal_logged", { method: "saved" });
      haptic.success();
      refreshDay();
      queryClient.invalidateQueries({ queryKey: savedMealsQuery.queryKey });
      showDay(date);
      router.dismissTo("/today");
    } catch (err) {
      setError(errorMessage(err, "Couldn't add that. Try again."));
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.ground }}
      // Padding on Android too: the app is edge-to-edge, so the window no longer resizes for the
      // keyboard and the field or Save button would sit behind it.
      behavior="padding"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}
      >
        <View style={styles.top}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={styles.close}
          >
            <X size={26} color={c.ink} />
          </PressableScale>
        </View>

        <Text variant="h1">What did you eat?</Text>

        <MealWhen mealType={mealType} onMealType={setMealType} date={date} />

        <View style={{ gap: 8 }}>
          <TextInput
            accessibilityLabel="What did you eat?"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            placeholder="2 roti, 1 katori dal, half katori bhindi, 1 cup chai with 1 sachet sugar"
            placeholderTextColor={c.ink3}
            style={styles.textarea}
            textAlignVertical="top"
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Info size={16} color={c.ink3} style={{ marginTop: 2 }} />
            <Text size={13} color={c.ink3} style={{ flex: 1 }}>
              Add amounts for better numbers: pieces, katori, cups, grams or ml. Typing never uses a photo scan.
            </Text>
          </View>
          {error && <FieldError>{error}</FieldError>}
        </View>

        {saved.isSuccess && (
          <SavedMealsSection
            meals={saved.data}
            busy={busy}
            mealType={mealType}
            mealChosen={mealChosen}
            params={params}
            onLog={logSaved}
          />
        )}

        {(usuals.data?.length ?? 0) > 0 && (
          <UsualsSection usuals={usuals.data!} busy={busy} mealType={mealType} onRelog={relog} />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom) }]}>
        <Button onPress={submit} loading={busy === "text"} disabled={busy !== null && busy !== "text"}>
          Get calories
        </Button>
        <ModeTabs current="type" params={params} tone="light" />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  close: { width: 44, height: 44, marginLeft: -8, alignItems: "center", justifyContent: "center" },
  textarea: {
    minHeight: 144,
    borderWidth: 1,
    borderColor: c.lineStrong,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    padding: 16,
    fontFamily: fonts.sans400,
    fontSize: 17,
    lineHeight: 23,
    color: c.ink,
  },
  footer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 16,
    backgroundColor: c.ground,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.line,
  },
}));
