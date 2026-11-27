import { MEASUREMENT_KEYS, type MeasurementKey } from "@fitr8/contracts";
import { useQuery } from "@tanstack/react-query";
import { Activity, Ruler, TrendingDown, type LucideIcon } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { AddMeasurementSheet, type MeasureFocus } from "@/components/measurements/add-measurement-sheet";
import { ProfilePage } from "@/components/profile/profile-page";
import { QueryError } from "@/components/query-error";
import { ListSkeleton } from "@/components/skeletons";
import { MenuGroup, MenuRow, PillButton, Text } from "@/components/ui";
import { useMe } from "@/lib/auth";
import { formatMeasure, MEASURE_FIELDS, MEASURE_ROWS, updatedLabel } from "@/lib/measurements";
import { measurementsQuery } from "@/lib/queries";
import { makeStyles, useColors, radius } from "@/lib/theme";
import { usePullRefresh } from "@/lib/use-pull-refresh";

/** Figma row icons: weight trending-down, body fat activity, tape measures ruler. */
const ICON: Partial<Record<MeasurementKey, LucideIcon>> = { weightKg: TrendingDown, bodyFatPct: Activity };

/**
 * Profile / Measurements (Figma frame 11): each measurement's newest value and when it was taken,
 * a tip, and "Add measurement" (a sheet; tapping a row opens it at that field). Neck follows the
 * design's six rows: it's entered for the body-fat formula, so its latest value is shown too.
 * `?add=<field>` opens the sheet at that field on arrival.
 */
export default function MeasurementsScreen() {
  const c = useColors();
  const styles = useStyles();
  const me = useMe();
  const query = useQuery(measurementsQuery);
  const pull = usePullRefresh(() => query.refetch());
  const [focus, setFocus] = useState<MeasureFocus | null>(null);
  const [open, setOpen] = useState(false);

  const openAt = (f: MeasureFocus | null) => {
    setFocus(f);
    setOpen(true);
  };

  // `/measurements?add=weightKg` (Home's weight card, Progress "Add weigh-in", the weigh-in
  // notification) opens the sheet at that field once; the param is cleared so back/refresh don't.
  const { add } = useLocalSearchParams<{ add?: string }>();
  const [handled, setHandled] = useState<string | undefined>();
  if (add && add !== handled) {
    setHandled(add);
    const field = MEASURE_FIELDS.find((f) => f.key === add)?.key;
    openAt(field ?? (add === "bodyFatPct" ? "bodyFat" : null));
  }
  useEffect(() => {
    if (!add) return;
    // After the first frame: on a cold start the navigator isn't ready to take new params yet.
    const t = setTimeout(() => router.setParams({ add: undefined }), 0);
    return () => clearTimeout(t);
  }, [add]);

  return (
    <ProfilePage
      title="Measurements"
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
      footer={<PillButton label="Add measurement" onPress={() => openAt(null)} />}
    >
      {query.isPending ? (
        <ListSkeleton rows={6} />
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <MenuGroup label="Latest">
          {MEASUREMENT_KEYS.map((key) => {
            const m = query.data[key];
            const { label } = MEASURE_ROWS[key];
            return (
              <MenuRow
                key={key}
                icon={ICON[key] ?? Ruler}
                title={label}
                subtitle={
                  m ? updatedLabel(m.date) : key === "bodyFatPct" ? "Add waist and neck to see it" : "Not measured yet"
                }
                value={m ? formatMeasure(key, m.value) : null}
                accessibilityLabel={`${label}, ${m ? `${formatMeasure(key, m.value)}, ${updatedLabel(m.date)}` : "not measured yet"}. Add`}
                onPress={() => openAt(key === "bodyFatPct" ? "bodyFat" : key)}
              />
            );
          })}
        </MenuGroup>
      )}

      <View style={styles.tip}>
        <Text variant="labelMedium" color={c.ink} style={{ flex: 1, lineHeight: 18 }}>
          Measure at the same time each week — mornings, before eating — for the most reliable trend.
        </Text>
      </View>

      <AddMeasurementSheet
        open={open}
        focus={focus}
        latest={query.data}
        sex={me.profile?.sex}
        onClose={() => setOpen(false)}
      />
    </ProfilePage>
  );
}

const useStyles = makeStyles((c) => ({
  // Figma: bg/accent-subtle, radius md (16), 14 px (16 right) padding, Label/Medium 18 px lines.
  tip: {
    flexDirection: "row",
    borderRadius: radius.box,
    backgroundColor: c.brandSoft,
    padding: 16,
  },
}));
