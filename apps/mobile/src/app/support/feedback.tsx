import { FEEDBACK_MESSAGE_MAX, type FeedbackInput, type FeedbackSentDto } from "@fitr8/contracts";
import { useState } from "react";
import { View } from "react-native";
import { ProfilePage } from "@/components/profile/profile-page";
import { Chip, FieldError, FormField, PillButton, Text, TextField, goBack } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { appVersion, feedbackPlatform } from "@/lib/support";
import { showToast } from "@/lib/toast";
import { useColors } from "@/lib/theme";

const TOPICS = ["Bug", "Idea", "Question", "Other"] as const;

/**
 * Help & support → Send feedback: an optional topic and the message, sent to POST /api/feedback
 * with the app version and platform (staff read it at /admin/feedback).
 */
export default function FeedbackScreen() {
  const c = useColors();
  const [topic, setTopic] = useState<(typeof TOPICS)[number] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = message.trim();
    setError(null);
    if (text.length < 2) return setError("Tell us a little more");
    setBusy(true);
    try {
      const body: FeedbackInput = {
        message: text,
        ...(topic ? { topic } : {}),
        appVersion: appVersion(),
        platform: feedbackPlatform(),
      };
      await api<FeedbackSentDto>("/api/feedback", { json: body });
      showToast("Thanks, we read every message");
      goBack();
    } catch (e) {
      setError(errorMessage(e, "Couldn't send. Try again."));
      setBusy(false);
    }
  }

  return (
    <ProfilePage
      title="Send feedback"
      eyebrow="Help & support"
      intro="Found a bug or have an idea? Tell us. Your app version is sent with it."
      footer={<PillButton label="Send feedback" onPress={send} loading={busy} />}
    >
      <FormField label="Topic (optional)">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TOPICS.map((t) => (
            <Chip key={t} selected={topic === t} onPress={() => setTopic(topic === t ? null : t)}>
              {t}
            </Chip>
          ))}
        </View>
      </FormField>
      <FormField label="Your message">
        <TextField
          accessibilityLabel="Your message"
          value={message}
          onChangeText={(v) => {
            setMessage(v);
            if (error) setError(null);
          }}
          placeholder="What happened, or what would make FITR8 better?"
          multiline
          maxLength={FEEDBACK_MESSAGE_MAX}
          invalid={Boolean(error)}
          style={{ height: 160, paddingTop: 14, textAlignVertical: "top" }}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>{error ? <FieldError>{error}</FieldError> : null}</View>
          <Text variant="caption" color={c.ink3} tabular>
            {message.length}/{FEEDBACK_MESSAGE_MAX}
          </Text>
        </View>
      </FormField>
    </ProfilePage>
  );
}
