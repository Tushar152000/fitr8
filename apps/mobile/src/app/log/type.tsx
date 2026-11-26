import type { SavedMealDto, UsualDto } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Info, X } from "lucide-react-native";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { MealWhen } from "@/components/log/meal-when";
import { SavedMealsSection, UsualsSection } from "@/components/log/quick-log-lists";
import { Button, FieldError, IconButton, Screen, Text } from "@/components/ui";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { useLeaveLog } from "@/lib/use-leave-log";
import { useMealChoice } from "@/lib/meal-param";
import { savedMealsQuery } from "@/lib/queries";
import { queryClient, refreshDay } from "@/lib/query";
import { fonts, makeStyles, radius, useColors, INPUT_CARET } from "@/lib/theme";
import { showDay } from "@/lib/view-day";
import { haptic } from "@/lib/haptics";

/** Screen 7b: type what you ate, or relog a usual with one tap. Typing never uses a photo scan. */
export default function TypeMealScreen() {
  const c = useColors();
  const styles = useStyles();
  const { mealType, mealChosen, setMealType, date, dateBody, params } = useMealChoice();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // "text", a usual's mealId or a saved meal's id
  const [error, setError] = useState<string | null>(null);
  const usuals = useQuery({
    queryKey: ["usuals"],
    queryFn: () => api<{ usuals: UsualDto[] }>("/api/meals/usuals").then((r) => r.usuals),
  });
  const saved = useQuery(savedMealsQuery);

  /**
   * Close (user decision 2026-11-27): before "Get calories" it goes back one step (to the camera when
   * Type came from it, else where it was opened from); once the meal is on its way it leaves the log
   * flow, back where logging started.
   */
  const leaveLog = useLeaveLog();
  function close() {
    if (busy === "text" || !router.canGoBack()) leaveLog();
    else router.back();
  }

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
      leaveLog();
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
      leaveLog();
    } catch (err) {
      setError(errorMessage(err, "Couldn't add that. Try again."));
      setBusy(null);
    }
  }

  return (
    <Screen
      contentStyle={{ gap: 16 }}
      footer={
        <Button onPress={submit} loading={busy === "text"} disabled={busy !== null && busy !== "text"}>
          Get calories
        </Button>
      }
    >
      {/* Close, not back: it leaves Type (to the camera or where logging started), see close(). */}
      <View style={styles.top}>
        <IconButton label="Close" onPress={close} icon={<X size={20} color={c.ink} strokeWidth={2} />} />
        <Text variant="heading1" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
          What did you eat?
        </Text>
      </View>

      <MealWhen mealType={mealType} onMealType={setMealType} date={date} />

      <View style={{ gap: 10 }}>
        <TextInput
          {...INPUT_CARET}
          accessibilityLabel="What did you eat?"
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline
          maxLength={500}
          placeholder="2 roti, 1 katori dal, half katori bhindi, 1 cup chai with 1 sachet sugar"
          placeholderTextColor={c.ink3}
          style={[styles.textarea, focused && { borderColor: c.ink }]}
          textAlignVertical="top"
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Info size={14} color={c.ink2} strokeWidth={2} style={{ marginTop: 2 }} />
          <Text variant="labelRegular" color={c.ink2} style={{ flex: 1, lineHeight: 17 }}>
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
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  // The v2 field (TextField): white, hairline, ink border on focus; as tall as a short meal list.
  textarea: {
    minHeight: 144,
    borderWidth: 1,
    borderColor: c.lineStrong,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    padding: 16,
    fontFamily: fonts.sans400,
    fontSize: 16,
    lineHeight: 22,
    color: c.ink,
    outlineWidth: 0,
  },
}));
