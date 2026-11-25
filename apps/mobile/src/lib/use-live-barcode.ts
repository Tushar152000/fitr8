import type { BarcodeScanningResult } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";
import { decideRead, leadingRead, normalizeBarcode, READ_WINDOW_MS, type Read } from "@/lib/barcode";

/** A barcode counts as "in frame" until the camera hasn't seen it for this long. */
const SEEN_FOR_MS = 1200;

/**
 * Live barcode reads from the camera. `seen` is the code in view right now (the most-read one,
 * cleared shortly after it leaves the frame); on a clear vote `onRead` fires once per time it's in
 * frame, with a short vibration. Pass `onBarcode` to `CameraView.onBarcodeScanned`.
 */
export function useLiveBarcode(onRead: (code: string) => void) {
  const [seen, setSeen] = useState<string | null>(null);
  const seenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Auto-open bookkeeping (refs: they change on every camera frame, nothing renders from them).
  const reads = useRef<Read[]>([]);
  const opened = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (seenTimer.current) clearTimeout(seenTimer.current);
    },
    [],
  );

  function onBarcode(result: BarcodeScanningResult) {
    const code = normalizeBarcode(result.data);
    if (!code) return;
    if (seenTimer.current) clearTimeout(seenTimer.current);
    seenTimer.current = setTimeout(() => {
      setSeen(null);
      // Gone from the frame: the same product can open again next time it's pointed at.
      opened.current = null;
      reads.current = [];
    }, SEEN_FOR_MS);

    // Auto-open on a clear vote, once per time it's in frame (coming back from the product screen
    // with the pack still in view doesn't reopen it).
    if (opened.current) return;
    const now = Date.now();
    reads.current = [...reads.current.filter((r) => now - r.at < READ_WINDOW_MS), { code, at: now }];
    // Show (and let the shutter open) the most-read code, not whatever the last frame said.
    setSeen(leadingRead(reads.current));
    const winner = decideRead(reads.current);
    if (winner) {
      opened.current = winner;
      reads.current = [];
      Vibration.vibrate(40);
      onRead(winner);
    }
  }

  return { seen, onBarcode };
}
