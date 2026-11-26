import { Check, ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Sheet } from "@/components/sheet";
import { FormField, PressableScale, Text, TextField } from "@/components/ui";
import { flagEmoji, PHONE_COUNTRIES, type PersonDetails, type PersonProblems, type PhoneCountry } from "@/lib/person";
import { makeStyles, radius, useColors } from "@/lib/theme";

const PLACEHOLDER = "rgba(107,110,118,0.6)";

/** Onboarding step 0, "Your details" (first-time users only): name, last name and an optional phone. */
export function DetailsStep({
  person,
  setPerson,
  errors,
}: {
  person: PersonDetails;
  setPerson: (key: keyof PersonDetails, value: string) => void;
  errors: PersonProblems;
}) {
  const c = useColors();
  const styles = useStyles();
  const [picking, setPicking] = useState(false);
  const picked = PHONE_COUNTRIES.find((c) => c.iso === person.phoneCountry) ?? PHONE_COUNTRIES[0]!;
  return (
    <View style={{ gap: 20 }}>
      <FormField label="First name" error={errors.name}>
        <TextField
          accessibilityLabel="First name"
          value={person.name}
          onChangeText={(v) => setPerson("name", v)}
          placeholder="e.g. Aarav"
          placeholderTextColor={PLACEHOLDER}
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          maxLength={60}
          invalid={Boolean(errors.name)}
        />
      </FormField>
      <FormField label="Last name" error={errors.lastName}>
        <TextField
          accessibilityLabel="Last name"
          value={person.lastName}
          onChangeText={(v) => setPerson("lastName", v)}
          placeholder="e.g. Sharma"
          placeholderTextColor={PLACEHOLDER}
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
          maxLength={60}
          invalid={Boolean(errors.lastName)}
        />
      </FormField>
      <FormField label="Phone number (optional)" error={errors.phone}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Country code, ${picked.name} +${picked.dial}`}
            accessibilityHint="Opens the list of countries"
            onPress={() => setPicking(true)}
            style={styles.countryButton}
          >
            <Text size={22}>{flagEmoji(picked.iso)}</Text>
            <Text weight={600} size={16}>
              +{picked.dial}
            </Text>
            <ChevronDown size={16} color={c.ink3} />
          </PressableScale>
          <TextField
            accessibilityLabel="Phone number, optional"
            value={person.phone}
            onChangeText={(v) => setPerson("phone", v)}
            placeholder={picked.iso === "IN" ? "98765 43210" : "Phone number"}
            placeholderTextColor={PLACEHOLDER}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={20}
            invalid={Boolean(errors.phone)}
            style={{ flex: 1, minWidth: 0 }}
          />
        </View>
        {!errors.phone && (
          <Text size={13} color={c.ink3}>
            We only use it for your account, never for marketing.
          </Text>
        )}
      </FormField>
      <CountrySheet
        open={picking}
        picked={picked}
        onClose={() => setPicking(false)}
        onPick={(iso) => {
          setPerson("phoneCountry", iso);
          setPicking(false);
        }}
      />
    </View>
  );
}

/** The country-code list: flag, name and dial code, the picked one ticked. */
function CountrySheet({
  open,
  picked,
  onClose,
  onPick,
}: {
  open: boolean;
  picked: PhoneCountry;
  onClose: () => void;
  onPick: (iso: PhoneCountry["iso"]) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Sheet open={open} onClose={onClose} title="Country code">
      <View>
        {PHONE_COUNTRIES.map((country) => {
          const selected = country.iso === picked.iso;
          return (
            <PressableScale
              key={country.iso}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${country.name}, +${country.dial}`}
              onPress={() => onPick(country.iso)}
              style={[styles.countryRow, selected && { backgroundColor: c.sunken }]}
            >
              <Text size={22}>{flagEmoji(country.iso)}</Text>
              <Text weight={selected ? 600 : 400} size={16} style={{ flex: 1 }}>
                {country.name}
              </Text>
              <Text size={15} color={c.ink3}>
                +{country.dial}
              </Text>
              {selected && <Check size={18} color={c.brand} />}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((c) => ({
  /** Sized and bordered like the phone input beside it. */
  countryButton: {
    height: 52,
    borderWidth: 1,
    borderColor: c.lineStrong,
    borderRadius: radius.input,
    backgroundColor: c.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: radius.input,
  },
}));
