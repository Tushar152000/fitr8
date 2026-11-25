import type { UsageDto } from "@fitr8/contracts";
import { useState } from "react";
import { ApiError } from "@/lib/api";

/**
 * The daily photo-scan limit (HTTP 429) for a screen that scans: `catchLimit(e)` opens the limit
 * sheet when `e` is that error and says whether it was; `sheet` is spread onto `AiLimitSheet`.
 */
export function useScanLimit() {
  const [usage, setUsage] = useState<UsageDto | null>(null);
  const [open, setOpen] = useState(false);

  /** `needsUsage`: only treat a 429 as the limit when it says how many scans were used. */
  function catchLimit(e: unknown, { needsUsage = false } = {}): boolean {
    if (!(e instanceof ApiError) || e.status !== 429 || (needsUsage && !e.details)) return false;
    setUsage((e.details as UsageDto | undefined) ?? null);
    setOpen(true);
    return true;
  }

  return { catchLimit, sheet: { open, onClose: () => setOpen(false), usage } };
}
