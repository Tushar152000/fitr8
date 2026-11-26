import type { ExpoSpeechRecognitionModule as SpeechModule } from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { haptic } from "@/lib/haptics";

type Speech = typeof SpeechModule;
let speech: Speech | null | undefined;
/**
 * The speech module, or null where it can't run: Expo Go, an app build from before it was added
 * (an OTA update reaching an older binary) or a browser without the Web Speech API. Loaded lazily,
 * because importing it where the native module is missing throws.
 */
function speechModule(): Speech | null {
  if (speech === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("expo-speech-recognition").ExpoSpeechRecognitionModule as Speech;
      speech = mod.isRecognitionAvailable() ? mod : null;
    } catch {
      speech = null;
    }
  }
  return speech;
}

/**
 * Words the recogniser should expect (iOS contextual strings; Android and the web use them as
 * hints where supported): Indian foods and fitness terms the coach hears most, so "paneer" isn't
 * heard as "planner".
 */
const VOCABULARY = [
  "roti",
  "chapati",
  "paratha",
  "dal",
  "rajma",
  "chole",
  "paneer",
  "poha",
  "upma",
  "idli",
  "dosa",
  "sambar",
  "khichdi",
  "biryani",
  "pulao",
  "curd",
  "dahi",
  "ghee",
  "lassi",
  "chaas",
  "katori",
  "protein",
  "carbs",
  "calories",
  "kcal",
  "macros",
  "creatine",
  "whey",
  "deadlift",
  "squat",
  "bench press",
  "reps",
  "sets",
  "cardio",
  "HIIT",
  "VO2 max",
  "weigh-in",
  "deload",
];

/**
 * Talk instead of type (Figma "Composer" mic). `toggle()` asks for the microphone (and, on iPhone,
 * speech recognition) the first time, then listens in English (India) with live results:
 * `onText(text)` gets the draft as it was plus what's been said so far, every time it changes.
 * It stops by itself after a pause, or on a second tap. Where speech can't run (Firefox, Expo Go,
 * an app build from before voice) the mic still shows, as designed, and a tap says why.
 */
export function useVoiceInput({
  draft,
  onText,
  onError,
}: {
  draft: string;
  onText: (text: string) => void;
  onError: (message: string) => void;
}) {
  const mod = speechModule();
  const [listening, setListening] = useState(false);
  // The draft when listening started: speech is added after it.
  const base = useRef("");
  const handlers = useRef({ onText, onError });
  useEffect(() => {
    handlers.current = { onText, onError };
  });

  useEffect(() => {
    if (!mod) return;
    const subs = [
      mod.addListener("result", (e) => {
        const said = e.results[0]?.transcript?.trim() ?? "";
        if (said) handlers.current.onText(base.current ? `${base.current} ${said}` : said);
      }),
      mod.addListener("end", () => setListening(false)),
      mod.addListener("error", (e) => {
        setListening(false);
        // Stopping on purpose, or a pause with nothing said, isn't an error worth showing.
        if (e.error === "aborted" || e.error === "no-speech" || e.error === "speech-timeout") return;
        handlers.current.onError(
          e.error === "not-allowed"
            ? "Allow the microphone for FITR8 in your phone's settings to talk to your coach."
            : e.error === "network"
              ? "Voice needs a connection right now. Try again, or type."
              : "Couldn't hear that. Try again, or type.",
        );
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      mod.abort();
    };
  }, [mod]);

  const toggle = useCallback(async () => {
    if (!mod) {
      handlers.current.onError(
        Platform.OS === "web"
          ? "Voice works in Chrome, Edge or Safari, and in the FITR8 app. Type your message here."
          : "Update FITR8 to talk to your coach. For now, type your message.",
      );
      return;
    }
    if (listening) {
      mod.stop();
      return;
    }
    const permission = await mod.requestPermissionsAsync();
    if (!permission.granted) {
      handlers.current.onError("Allow the microphone for FITR8 in your phone's settings to talk to your coach.");
      return;
    }
    base.current = draft.trim();
    haptic.press();
    setListening(true);
    mod.start({
      lang: "en-IN",
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
      contextualStrings: VOCABULARY,
      // Android: wait a little longer through a pause before deciding the user is done.
      androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2000 },
    });
  }, [mod, listening, draft]);

  return { available: Boolean(mod), listening, toggle };
}
