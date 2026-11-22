import { describe, expect, it } from "vitest";
import { localImages, missingFiles, parseManifest, rewriteImageSources } from "./import";

const html = `<p>Intro</p>
<img
  src="paneer.jpg"
  alt="Paneer and roti"
  loading="lazy"
/>
<p>Text</p><img src="https://cdn.example/x.png" alt="remote"><img src="rajma.jpg"><img src="paneer.jpg" alt="again">
<img src="/blog/local.png" alt="site path">`;

describe("parseManifest", () => {
  it("accepts a full manifest and fills defaults", () => {
    const r = parseManifest(
      JSON.stringify({
        title: "Protein",
        tags: ["Protein"],
        cover: { file: "dal.jpg", alt: "Dal" },
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.manifest.body).toBe("article.html");
      expect(r.manifest.faq).toEqual([]);
      expect(r.manifest.cover).toEqual({ file: "dal.jpg", alt: "Dal" });
    }
  });

  it("explains what's wrong", () => {
    expect(parseManifest("{nope")).toEqual({ ok: false, error: "post.json isn't valid JSON." });
    const r = parseManifest(JSON.stringify({ title: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^post\.json: title:/);
    const faq = parseManifest(JSON.stringify({ title: "x", faq: [{ question: "q" }] }));
    expect(faq.ok).toBe(false);
  });
});

describe("localImages", () => {
  it("lists relative images once, with alt, across line breaks", () => {
    expect(localImages(html)).toEqual([
      { file: "paneer.jpg", alt: "Paneer and roti" },
      { file: "rajma.jpg", alt: null },
    ]);
  });
});

describe("rewriteImageSources", () => {
  it("points local files at uploaded URLs and leaves the rest", () => {
    const out = rewriteImageSources(html, {
      "paneer.jpg": "https://api/m/1.jpg",
      "rajma.jpg": "https://api/m/2.jpg",
    });
    expect(out).toContain('src="https://api/m/1.jpg"');
    expect(out).toContain('src="https://api/m/2.jpg"');
    expect(out).toContain('src="https://cdn.example/x.png"');
    expect(out).toContain('src="/blog/local.png"');
    expect(out).not.toContain('src="paneer.jpg"');
    expect(out).toContain('alt="Paneer and roti"');
  });
});

describe("missingFiles", () => {
  it("names every file still needed", () => {
    const r = parseManifest(
      JSON.stringify({ title: "x", cover: { file: "dal.jpg" }, ogImage: { file: "card.png" } }),
    );
    if (!r.ok) throw new Error(r.error);
    expect(missingFiles(r.manifest, html, ["article.html", "dal.jpg", "paneer.jpg"])).toEqual([
      "card.png",
      "rajma.jpg",
    ]);
    expect(missingFiles(r.manifest, null, ["post.json"])).toEqual([
      "article.html",
      "dal.jpg",
      "card.png",
    ]);
  });
});
