import { cn } from "@/lib/cn";

/**
 * The FITR8 mark (2026-11-24): a white angled stroke and a lime square, 718 × 711 units, drawn from
 * the brand master (public/brand/mark-full.svg). Same paths as apps/mobile ui/logo.tsx.
 */
export const MARK_STROKE =
  "M42 0L672 0Q718 0 718 46L718 184Q718 224 678 224L429 224Q426 224 428.1 226.1L681.2 479.2Q718 516 718 568L718 671Q718 711 678 711L560 711Q512 711 478.1 677.1L29.7 228.7Q0 199 0 157L0 42Q0 0 42 0Z";
export const MARK_SQUARE =
  "M40 488L184 488Q224 488 224 528L224 671Q224 711 184 711L40 711Q0 711 0 671L0 528Q0 488 40 488Z";
export const MARK_LIME = "#BED465";
export const MARK_TILE = "#000000";

/** The mark at 50% of a 512 tile, centred. */
const TILE_TRANSFORM = "translate(128 129.25) scale(0.35655)";

/**
 * App icon: the mark on a black tile (docs/DESIGN.md → Brand; same artwork as
 * public/brand/mark.svg). Use 24–40 px in the UI.
 */
export function LogoMark({
  size = 32,
  title,
  className,
}: {
  size?: number;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="512" height="512" rx="116" fill={MARK_TILE} />
      <g transform={TILE_TRANSFORM}>
        <path d={MARK_STROKE} fill="#fff" />
        <path d={MARK_SQUARE} fill={MARK_LIME} />
      </g>
    </svg>
  );
}

/** Icon + wordmark "FITR8": "FIT" in ink (white on dark), "R8" in brand purple. */
export function Logo({
  size = 32,
  onDark = false,
  className,
}: {
  size?: number;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span
        className="font-display leading-none font-bold tracking-[-0.02em]"
        style={{ fontSize: Math.round(size * 0.7) }}
      >
        <span className={onDark ? "text-white" : "text-ink"}>FIT</span>
        <span className="text-brand">R8</span>
      </span>
    </span>
  );
}

/** The bare mark (no tile) in `currentColor`, e.g. a faint watermark on the landing hero. */
export function BareMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 718 711" className={cn("shrink-0 fill-current", className)} aria-hidden>
      <path d={MARK_STROKE} />
      <path d={MARK_SQUARE} />
    </svg>
  );
}
