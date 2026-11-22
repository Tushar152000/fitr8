"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { BlogAdminPostDto, BlogCategoryDto, BlogTagDto } from "@fitr8/contracts";
import { Button } from "@/components/ui";
import { blogApi, uploadBlogImage } from "@/lib/admin/api";
import { localImages, missingFiles, parseManifest, rewriteImageSources } from "@/lib/admin/import";
import { Modal } from "./modal";
import { smallButton } from "./ui";

/**
 * Imports a post prepared as files (docs/BLOG.md "Importing a post"): post.json, the article HTML
 * and its images. Uploads the images, creates the category and tags if needed, fills every field
 * and opens the post as a draft to review and publish.
 */
export function ImportPostButton() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const say = (line: string) => setLog((l) => [...l, line]);

  async function run() {
    setError(null);
    setLog([]);
    const byName = new Map(files.map((f) => [f.name, f]));
    const manifestFile = byName.get("post.json");
    if (!manifestFile) return setError("Select post.json together with the other files.");
    const parsed = parseManifest(await manifestFile.text());
    if (!parsed.ok) return setError(parsed.error);
    const m = parsed.manifest;
    const bodyFile = byName.get(m.body);
    const html = bodyFile ? await bodyFile.text() : null;
    const missing = missingFiles(m, html, [...byName.keys()]);
    if (missing.length) return setError(`Also select: ${missing.join(", ")}`);

    setBusy(true);
    try {
      // 1. Images: inline ones, the cover and the social image (each once).
      const urls: Record<string, string> = {};
      const ids: Record<string, string> = {};
      const uploads = new Map<string, string | null>();
      for (const img of localImages(html!)) uploads.set(img.file, img.alt);
      if (m.cover) uploads.set(m.cover.file, m.cover.alt ?? uploads.get(m.cover.file) ?? null);
      if (m.ogImage)
        uploads.set(m.ogImage.file, m.ogImage.alt ?? uploads.get(m.ogImage.file) ?? null);
      for (const [file, alt] of uploads) {
        say(`Uploading ${file}…`);
        const media = await uploadBlogImage(byName.get(file)!, alt);
        urls[file] = media.url;
        ids[file] = media.id;
      }

      // 2. Category and tags: reuse by name, create the rest.
      let categoryId: string | null = null;
      if (m.category) {
        const all = await blogApi<BlogCategoryDto[]>("/categories");
        const found = all.find((c) => c.name.toLowerCase() === m.category!.toLowerCase());
        categoryId = found
          ? found.id
          : (
              await blogApi<BlogCategoryDto>("/categories", {
                method: "POST",
                json: { name: m.category },
              })
            ).id;
        say(`Category: ${m.category}${found ? "" : " (created)"}`);
      }
      const tagIds: string[] = [];
      if (m.tags.length) {
        const all = await blogApi<BlogTagDto[]>("/tags");
        for (const name of m.tags) {
          const found = all.find((t) => t.name.toLowerCase() === name.toLowerCase());
          tagIds.push(
            found
              ? found.id
              : (await blogApi<BlogTagDto>("/tags", { method: "POST", json: { name } })).id,
          );
        }
        say(`Tags: ${m.tags.join(", ")}`);
      }

      // 3. The post, as a draft with every field filled in.
      say("Creating the post…");
      const draft = await blogApi<BlogAdminPostDto>("/posts", {
        method: "POST",
        json: { title: m.title },
      });
      await blogApi<BlogAdminPostDto>(`/posts/${draft.id}`, {
        method: "PUT",
        json: {
          ...(m.slug ? { slug: m.slug } : {}),
          excerpt: m.excerpt ?? null,
          contentJson: { type: "doc", content: [] },
          contentHtml: rewriteImageSources(html!, urls),
          coverId: m.cover ? ids[m.cover.file] : null,
          coverAlt: m.cover?.alt ?? null,
          ogImageId: m.ogImage ? ids[m.ogImage.file] : null,
          categoryId,
          tagIds,
          metaTitle: m.metaTitle ?? null,
          metaDescription: m.metaDescription ?? null,
          focusKeyword: m.focusKeyword ?? null,
          faq: m.faq,
          ...(m.featured !== undefined ? { featured: m.featured } : {}),
          snapshot: true,
        },
      }).catch((err) => {
        // Keep the draft (images and title are in) and say what to fix there.
        throw new Error(
          `The draft was created but some fields weren't saved: ${err instanceof Error ? err.message : err}. Open it from Posts to finish.`,
        );
      });
      say("Done. Opening the draft…");
      router.push(`/admin/blog/posts/${draft.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={smallButton} onClick={() => setOpen(true)}>
        <FileUp className="size-4" aria-hidden />
        Import post
      </button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Import a post">
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-ink-2">
            Select all the files of a prepared post at once: <code>post.json</code>, the article (
            <code>article.html</code>) and its images. It becomes a draft you can review before
            publishing.
          </p>
          <button
            type="button"
            className={smallButton}
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <FileUp className="size-4" aria-hidden />
            Choose files
          </button>
          <input
            ref={input}
            type="file"
            multiple
            accept=".json,.html,image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              setFiles(Array.from(e.target.files ?? []));
              setError(null);
              setLog([]);
            }}
          />
          {files.length > 0 && (
            <ul className="rounded-input bg-ground p-3 text-[13px] text-ink-2">
              {files.map((f) => (
                <li key={f.name}>{f.name}</li>
              ))}
            </ul>
          )}
          {log.length > 0 && (
            <ul role="status" className="text-[13px] text-ink-2">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-input bg-caution-soft px-3 py-2 text-[14px] font-semibold text-caution-text"
            >
              {error}
            </p>
          )}
          <Button onClick={run} disabled={busy || !files.length}>
            {busy ? "Importing…" : "Import as draft"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
