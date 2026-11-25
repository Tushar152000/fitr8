import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, View } from "react-native";
import { Sheet } from "@/components/sheet";
import { Button, Chip, FieldError, MenuGroup, MenuRow, Text, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/query";
import { fonts, makeStyles, useColors } from "@/lib/theme";
import type { DeleteReason } from "@fitr8/contracts";

const LEAVE_REASONS: { value: DeleteReason; label: string }[] = [
  { value: "logging_effort", label: "Logging takes too long" },
  { value: "inaccurate", label: "Numbers felt wrong" },
  { value: "price", label: "Too expensive" },
  { value: "goal_reached", label: "I reached my goal" },
  { value: "privacy", label: "Privacy worries" },
  { value: "other_app", label: "Using another app" },
  { value: "other", label: "Something else" },
];

/**
 * Delete account, deliberately slow: 1) what goes, a billing warning, an optional "why" (reasons and a
 * note, stored without the user) and "Sign out instead"; 2) type DELETE; 3) a last system alert.
 */
export function DangerZone({ onDeleted, onSignOut }: { onDeleted: () => void; onSignOut: () => void }) {
  const c = useColors();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"why" | "confirm">("why");
  const [reasons, setReasons] = useState<DeleteReason[]>([]);
  const [feedback, setFeedback] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setStep("why");
    setTyped("");
    setError(null);
  };
  const toggle = (r: DeleteReason) => setReasons((all) => (all.includes(r) ? all.filter((x) => x !== r) : [...all, r]));

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/account", {
        method: "DELETE",
        json: { reasons, ...(feedback.trim() ? { feedback: feedback.trim() } : {}) },
      });
      queryClient.clear();
      onDeleted();
    } catch {
      setError("Couldn't delete your account. Try again.");
      setBusy(false);
    }
  }

  /** The last stop: a system alert, so it can't be a stray tap. */
  function confirmLast() {
    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Delete your FITR8 account for good? This can't be undone.")) void remove();
      return;
    }
    Alert.alert("Delete for good?", "Your account and all your data go now. This can't be undone.", [
      { text: "Keep my account", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void remove() },
    ]);
  }

  return (
    <>
      <MenuGroup>
        <MenuRow
          icon={Trash2}
          title="Delete account"
          subtitle="Removes your account and all your data"
          onPress={() => setOpen(true)}
        />
      </MenuGroup>
      <Sheet open={open} onClose={close} title={step === "why" ? "Before you go" : "Delete your account?"}>
        {step === "why" ? (
          <>
            <Text color={c.ink2}>
              Deleting removes your meals, weigh-ins, workouts, streak, saved meals and plan for good. We can&apos;t
              bring them back. You can download a copy first from Settings → Privacy &amp; data.
            </Text>
            <Text size={13} color={c.cautionText}>
              Paying for FITR8 Premium through the App Store or Google Play? Cancel it there too: deleting your account
              doesn&apos;t stop the store billing you.
            </Text>
            <View style={{ gap: 8 }}>
              <Text weight={600}>Why are you leaving? (optional)</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {LEAVE_REASONS.map((r) => (
                  <Chip key={r.value} selected={reasons.includes(r.value)} onPress={() => toggle(r.value)}>
                    {r.label}
                  </Chip>
                ))}
              </View>
              <TextField
                accessibilityLabel="What could we do better? (optional)"
                value={feedback}
                onChangeText={setFeedback}
                placeholder="What could we do better? (optional)"
                multiline
                maxLength={1000}
                style={[styles.confirm, { height: 96, paddingTop: 12, textAlignVertical: "top" }]}
              />
              <Text size={12} color={c.ink3}>
                Your answer is kept without your name or email, only to make FITR8 better.
              </Text>
            </View>
            <Button variant="secondary" onPress={() => setStep("confirm")}>
              Continue to delete
            </Button>
            <Button
              onPress={() => {
                close();
                onSignOut();
              }}
            >
              Just sign out instead
            </Button>
            <Button variant="secondary" onPress={close}>
              Keep my account
            </Button>
          </>
        ) : (
          <>
            <Text color={c.ink2}>Type DELETE to confirm. This deletes everything now, for good.</Text>
            <TextField
              accessibilityLabel="Type DELETE to confirm"
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="DELETE"
              style={styles.confirm}
            />
            {error && <FieldError>{error}</FieldError>}
            <Button
              variant="danger"
              onPress={confirmLast}
              loading={busy}
              disabled={typed.trim().toUpperCase() !== "DELETE"}
            >
              Delete my account
            </Button>
            <Button variant="secondary" onPress={close} disabled={busy}>
              Keep my account
            </Button>
          </>
        )}
      </Sheet>
    </>
  );
}

// The bold, spaced-out text of the delete sheet's inputs (on top of TextField's box).
const useStyles = makeStyles(() => ({
  confirm: { fontFamily: fonts.sans600, fontSize: 18, letterSpacing: 2 },
}));
