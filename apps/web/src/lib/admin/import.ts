/**
 * "Import post": a post prepared as files (post.json + article.html + images, e.g. content/blog/<slug>/)
 * turned into API calls. Pure helpers here (tested); the browser side is components/admin/import-post.tsx.
 */
import { z } from "zod";
import { BlogFaqItemSchema } from "@fitr8/contracts";

const image = z.object({ file: z.string().min(1), alt: z.string().max(200).optional() });

/** post.json. `body` names the HTML file (default article.html); images are referenced by file name. */
export const ImportManifestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().max(300).nullish(),
  metaTitle: z.string().max(120).nullish(),
  metaDescription: z.string().max(320).nullish(),
  focusKeyword: z.string().max(80).nullish(),
  featured: z.boolean().optional(),
  category: z.string().trim().max(80).nullish(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  faq: z.array(BlogFaqItemSchema).max(20).default([]),
  cover: image.nullish(),
  ogImage: image.nullish(),
  body: z.string().default("article.html"),
});
export type ImportManifest = z.infer<typeof ImportManifestSchema>;

/** The manifest, or a readable reason it can't be used. */
export function parseManifest(
  text: string,
): { ok: true; manifest: ImportManifest } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "post.json isn't valid JSON." };
  }
  const parsed = ImportManifestSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    return { ok: false, error: `post.json: ${issue.path.join(".") || "file"}: ${issue.message}` };
  }
  return { ok: true, manifest: parsed.data };
}

const IMG = /<img\b[\s\S]*?>/gi;
const attr = (tag: string, name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag)?.[1] ?? null;

/** Local image files the HTML points at (relative src, not http/https/data), with their alt text. */
export function localImages(html: string): { file: string; alt: string | null }[] {
  const seen = new Map<string, string | null>();
  for (const [tag] of html.matchAll(IMG)) {
    const src = attr(tag, "src");
    if (!src || /^(https?:|data:|\/\/|\/)/i.test(src)) continue;
    if (!seen.has(src)) seen.set(src, attr(tag, "alt"));
  }
  return [...seen].map(([file, alt]) => ({ file, alt }));
}

/** Points each local `src="file"` at its uploaded URL. Tags may span lines. */
export function rewriteImageSources(html: string, urls: Record<string, string>): string {
  return html.replace(IMG, (tag) => {
    const src = attr(tag, "src");
    return src && urls[src] ? tag.replace(/\bsrc\s*=\s*"[^"]*"/i, `src="${urls[src]}"`) : tag;
  });
}

/** Every file the import needs that wasn't selected, so the user can add them before anything uploads. */
export function missingFiles(
  manifest: ImportManifest,
  html: string | null,
  selected: string[],
): string[] {
  const have = new Set(selected);
  const needed = [
    manifest.body,
    ...(manifest.cover ? [manifest.cover.file] : []),
    ...(manifest.ogImage ? [manifest.ogImage.file] : []),
    ...(html ? localImages(html).map((i) => i.file) : []),
  ];
  return [...new Set(needed)].filter((f) => !have.has(f));
}
