import { Mail } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { DetailsStep } from "@/components/onboarding/details-step";
import { DangerZone } from "@/components/profile/danger-zone";
import { ProfilePage } from "@/components/profile/profile-page";
import { FieldError, MenuGroup, MenuRow, PillButton, Text } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth, useMe } from "@/lib/auth";
import {
  personProblems,
  PHONE_TAKEN,
  phoneToE164,
  splitPhone,
  type PersonDetails,
  type PersonProblems,
} from "@/lib/person";
import { showToast } from "@/lib/toast";
import { useColors } from "@/lib/theme";

/**
 * Settings → Account: the sign-in email, name and phone (same fields and rules as onboarding step
 * 0, saved with PATCH /api/profile/name), and Delete account (the two-sheet flow).
 */
export default function AccountScreen() {
  const c = useColors();
  const me = useMe();
  const { refresh, signOut } = useAuth();
  const saved = splitPhone(me.phone);
  const initial: PersonDetails = {
    name: me.name ?? "",
    lastName: me.lastName ?? "",
    phoneCountry: saved.country,
    phone: saved.national,
  };
  const [person, setPersonState] = useState(initial);
  const [errors, setErrors] = useState<PersonProblems>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = (Object.keys(initial) as (keyof PersonDetails)[]).some((k) => initial[k] !== person[k]);

  const setPerson = (key: keyof PersonDetails, value: string) => {
    setPersonState((p) => ({ ...p, [key]: value }));
    setErrors((e) => ({ ...e, [key === "phoneCountry" ? "phone" : key]: undefined }));
  };

  async function save() {
    const problems = personProblems(person);
    setErrors(problems);
    setError(null);
    if (Object.keys(problems).length) return;
    setBusy(true);
    try {
      await api("/api/profile/name", {
        method: "PATCH",
        json: {
          name: person.name.trim(),
          lastName: person.lastName.trim(),
          phone: person.phone.trim() ? phoneToE164(person.phoneCountry, person.phone) : null,
        },
      });
      await refresh();
      showToast("Saved");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setErrors({ phone: PHONE_TAKEN });
      else setError(errorMessage(e, "Couldn't save. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfilePage
      title="Account"
      eyebrow="Settings"
      footer={<PillButton label="Save changes" onPress={save} loading={busy} disabled={!changed} />}
    >
      {me.email ? (
        <MenuGroup>
          <MenuRow icon={Mail} title="Signed in as" subtitle={me.email} />
        </MenuGroup>
      ) : null}

      <View style={{ gap: 16 }}>
        <DetailsStep person={person} setPerson={setPerson} errors={errors} />
        {error ? <FieldError>{error}</FieldError> : null}
      </View>

      <DangerZone onDeleted={signOut} onSignOut={signOut} />

      <Text variant="caption" color={c.ink3} center>
        FITR8 gives general fitness guidance, not medical advice.
      </Text>
    </ProfilePage>
  );
}
