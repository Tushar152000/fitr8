import type { HealthSummaryDto } from "@fitr8/contracts";
import { BatteryCharging, Droplets, Footprints, HeartPulse, Moon, Scale, type LucideIcon } from "lucide-react-native";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { formatInt } from "@/lib/format";
import { makeStyles, radius, useColors } from "@/lib/theme";

/** "7 h 20 min" */
export function sleepText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

const BMI_LABEL = {
  underweight: "Underweight",
  normal: "Healthy range",
  overweight: "Overweight",
  obese: "Obese",
} as const;
export const RECOVERY_LABEL = { ready: "Ready to train", steady: "Take it steady", recover: "Recover today" } as const;

/**
 * The six health numbers FITR8 shows (everything else synced is stored, not shown): steps, heart
 * rate, BMI, SpO2, sleep and recovery. Each tile says "No data" rather than guessing.
 */
export function HealthMetrics({ s }: { s: HealthSummaryDto }) {
  const c = useColors();
  const stepsPct = s.steps ? Math.min(1, s.steps.count / s.steps.goal) : 0;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      <Tile
        icon={Footprints}
        tint={c.protein}
        label="Steps"
        value={s.steps ? formatInt(s.steps.count) : null}
        line={s.steps ? `of ${formatInt(s.steps.goal)} goal` : null}
        progress={s.steps ? stepsPct : null}
      />
      <Tile
        icon={HeartPulse}
        tint={c.fat}
        label="Heart rate"
        value={
          s.heartRate?.resting != null
            ? `${s.heartRate.resting}`
            : s.heartRate?.avg != null
              ? `${s.heartRate.avg}`
              : null
        }
        unit="bpm"
        line={
          s.heartRate
            ? s.heartRate.resting != null
              ? `resting${s.heartRate.avg != null ? ` · avg ${s.heartRate.avg}` : ""}`
              : `average${s.heartRate.min != null ? ` · ${s.heartRate.min}–${s.heartRate.max}` : ""}`
            : null
        }
      />
      <Tile
        icon={Scale}
        tint={c.brandText}
        label="BMI"
        value={s.bmi ? s.bmi.value.toFixed(1) : null}
        line={s.bmi ? BMI_LABEL[s.bmi.category] : null}
      />
      <Tile
        icon={Droplets}
        tint={c.water}
        label="Blood oxygen"
        value={s.spo2 ? `${Math.round(s.spo2.avg)}` : null}
        unit="%"
        line={s.spo2 ? `SpO₂ · lowest ${Math.round(s.spo2.min)}%` : null}
      />
      <Tile
        icon={Moon}
        tint={c.dayGym}
        label="Sleep"
        value={s.sleep ? sleepText(s.sleep.asleepMinutes) : null}
        line={s.sleep ? (s.sleep.deepMinutes ? `${sleepText(s.sleep.deepMinutes)} deep` : "last night") : null}
      />
      <Tile
        icon={BatteryCharging}
        tint={c.carbsText}
        label="Recovery"
        value={s.recovery ? `${s.recovery.score}` : null}
        unit="/100"
        line={s.recovery ? RECOVERY_LABEL[s.recovery.level] : null}
      />
    </View>
  );
}

function Tile({
  icon: Icon,
  tint,
  label,
  value,
  unit,
  line,
  progress,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
  value: string | null;
  unit?: string;
  line: string | null;
  progress?: number | null;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={value ? `${label}: ${value}${unit ?? ""}${line ? `, ${line}` : ""}` : `${label}: no data`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon size={16} color={tint} />
        <Text size={13} weight={600} color={c.ink2}>
          {label}
        </Text>
      </View>
      {value ? (
        <Text weight={700} size={22} tabular>
          {value}
          {unit ? (
            <Text size={13} weight={600} color={c.ink3}>
              {` ${unit}`}
            </Text>
          ) : null}
        </Text>
      ) : (
        <Text weight={700} size={22} color={c.ink3}>
          –
        </Text>
      )}
      {progress != null && (
        <View style={styles.track}>
          <View
            style={{ width: `${Math.round(progress * 100)}%`, height: "100%", backgroundColor: tint, borderRadius: 3 }}
          />
        </View>
      )}
      <Text size={12} color={c.ink3} numberOfLines={1}>
        {line ?? "No data yet"}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: c.surface,
  },
  track: { height: 6, borderRadius: 3, backgroundColor: c.track, overflow: "hidden" },
}));
