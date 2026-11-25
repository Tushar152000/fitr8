import { scanFromURLAsync } from "expo-camera";
import { Platform } from "react-native";
import { normalizeBarcode } from "@/lib/barcode";

/** Packaged-food barcodes (EAN-13/8, UPC-A/E), same set as the barcode screen. */
export const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"] as const;

/** A valid barcode in a still photo, or null. Never throws: no barcode just means "read the plate". */
export async function barcodeInPhoto(uri: string): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const found = await scanFromURLAsync(uri, [...BARCODE_TYPES]);
    for (const r of found) {
      const code = normalizeBarcode(r.data);
      if (code) return code;
    }
  } catch {
    // Unsupported image or scanner unavailable: fall through to the AI.
  }
  return null;
}
