import { Fragment, type ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui";
import { useColors } from "@/lib/theme";

/**
 * The coach's reply with its light formatting drawn properly (2026-11-28: `**bold**` and `- item`
 * showed as raw characters). Supports paragraphs, `#`–`###` headings, `-` / `*` / `•` bullets,
 * `1.` numbered lists and `**bold**` / `*italic*` inside a line. Anything else stays plain text,
 * so a half-streamed marker just shows as typed until it closes.
 */
export function RichText({ text }: { text: string }) {
  const c = useColors();
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    const heading = trimmed.match(/^#{1,3}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <Text key={i} variant="bodyStrong" style={{ marginTop: blocks.length ? 4 : 0 }}>
          {inline(heading[1]!, c.ink)}
        </Text>,
      );
      i++;
      continue;
    }
    const bullet = /^([-*•])\s+/;
    const numbered = /^(\d{1,2})[.)]\s+/;
    if (bullet.test(trimmed) || numbered.test(trimmed)) {
      const items: { marker: string; body: string }[] = [];
      while (i < lines.length) {
        const t = lines[i]!.trim();
        const b = t.match(bullet);
        const n = t.match(numbered);
        if (b) items.push({ marker: "•", body: t.replace(bullet, "") });
        else if (n) items.push({ marker: `${n[1]}.`, body: t.replace(numbered, "") });
        else break;
        i++;
      }
      blocks.push(
        <View key={`l${i}`} style={{ gap: 4 }}>
          {items.map((it, k) => (
            <View key={k} style={{ flexDirection: "row", gap: 8 }}>
              <Text color={c.brandText} tabular style={{ minWidth: 16 }}>
                {it.marker}
              </Text>
              <Text style={{ flex: 1 }}>{inline(it.body, c.ink)}</Text>
            </View>
          ))}
        </View>,
      );
      continue;
    }
    // A paragraph: this line and the next plain lines.
    const para: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const t = lines[i]!.trim();
      if (!t || /^#{1,3}\s/.test(t) || bullet.test(t) || numbered.test(t)) break;
      para.push(t);
      i++;
    }
    blocks.push(<Text key={`p${i}`}>{inline(para.join(" "), c.ink)}</Text>);
  }
  return <View style={{ gap: 8 }}>{blocks}</View>;
}

/** `**bold**` and `*italic*` / `_italic_` inside a line. */
function inline(s: string, ink: string): ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g);
  return parts.map((p, k) => {
    if (/^\*\*[^*]+\*\*$/.test(p))
      return (
        <Text key={k} weight={700} color={ink}>
          {p.slice(2, -2)}
        </Text>
      );
    if (/^(\*[^*].*\*|_[^_].*_)$/.test(p) && p.length > 2)
      return (
        <Text key={k} style={{ fontStyle: "italic" }} color={ink}>
          {p.slice(1, -1)}
        </Text>
      );
    return <Fragment key={k}>{p}</Fragment>;
  });
}
