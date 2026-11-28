/**
 * Parses the website support bot's FAQ files (prisma/data/support/*.md) for the seed. One file per
 * section, one `## Question` heading per entry, the answer below it:
 *
 *   ---
 *   section: Getting started and sign-in
 *   ---
 *
 *   ## How do I create an account?
 *   Tap "Start for free" on the website or "Continue with Google" in the app.
 *   Keywords: sign up, register, join
 *
 * The optional last `Keywords:` line adds words people type that the question doesn't contain.
 * Answers are short, plain and kind; they must match what the app and website really do
 * (docs/CHATBOT-FAQ.md lists the facts still to confirm).
 */
export interface SupportFaqInput {
  slug: string;
  section: string;
  question: string;
  answer: string;
  keywords: string;
}

export function slugify(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

export function parseSupportFile(file: string, text: string): SupportFaqInput[] {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${file}: missing --- front matter`);
  const section = match[1]!.match(/^section:\s*(.+)$/m)?.[1]?.trim();
  if (!section) throw new Error(`${file}: front matter needs "section:"`);

  const entries: SupportFaqInput[] = [];
  for (const block of match[2]!.split(/^## /m).slice(1)) {
    const [headline = "", ...rest] = block.split("\n");
    const question = headline.trim();
    let answer = rest.join("\n").trim();
    let keywords = "";
    const kw = answer.match(/\n?^Keywords:\s*(.+)$/m);
    if (kw) {
      keywords = kw[1]!.trim();
      answer = answer.replace(kw[0], "").trim();
    }
    if (question.length < 5) throw new Error(`${file}: "${question}" is too short for a question`);
    if (answer.length < 20) throw new Error(`${file}: "${question}" has no answer`);
    const slug = slugify(question);
    if (!slug) throw new Error(`${file}: "${question}" has no usable slug`);
    entries.push({ slug, section, question, answer, keywords });
  }
  if (!entries.length) throw new Error(`${file}: no "## Question" entries`);
  return entries;
}

/** Parses every file and rejects a slug used twice. */
export function parseSupportFiles(files: { name: string; text: string }[]): SupportFaqInput[] {
  const all = files.flatMap((f) => parseSupportFile(f.name, f.text));
  const seen = new Set<string>();
  for (const e of all) {
    if (seen.has(e.slug)) throw new Error(`duplicate support FAQ slug "${e.slug}"`);
    seen.add(e.slug);
  }
  return all;
}
