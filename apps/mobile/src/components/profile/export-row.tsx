import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Download } from "lucide-react-native";
import { useState } from "react";
import { Platform } from "react-native";
import { LinkRow, RowError } from "./rows";
import { apiText, errorMessage } from "@/lib/api";
import { useColors } from "@/lib/theme";

/** Design 13 "Export CSV": written to a cache file and handed to the share sheet. */
export function ExportRow() {
  const c = useColors();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    setBusy(true);
    setError(null);
    try {
      const csv = await apiText("/api/export");
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        Object.assign(document.createElement("a"), { href: url, download: "fitr8-export.csv" }).click();
        return;
      }
      const file = new File(Paths.cache, "fitr8-export.csv");
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/csv",
        UTI: "public.comma-separated-values-text",
        dialogTitle: "Export FITR8 data",
      });
    } catch (e) {
      setError(errorMessage(e, "Couldn't export. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <LinkRow
        label={busy ? "Preparing…" : "Export as CSV"}
        icon={<Download size={20} color={c.ink2} />}
        onPress={exportCsv}
      />
      {error && <RowError>{error}</RowError>}
    </>
  );
}
