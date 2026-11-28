import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service.js";
import { toOrQuery } from "../coach/knowledge/knowledge.service.js";
import { buildVocabulary, correctText } from "./typos.js";

/** Words that appear in nearly every FAQ answer or question, so they say nothing about which one fits. */
const FILLER = new Set([
  "fitr8",
  "get",
  "got",
  "can",
  "could",
  "would",
  "will",
  "does",
  "did",
  "use",
  "using",
  "make",
  "have",
  "want",
  "need",
  "tell",
  "give",
  "please",
  "app",
  "work",
  "works",
  "much",
  "many",
  "any",
  "in",
  "is",
  "it",
  "do",
  "to",
  "of",
  "on",
  "my",
  "me",
  "an",
  "as",
  "at",
  "be",
  "or",
  "so",
  "if",
  "we",
  "there",
  "about",
  "with",
  "from",
  "this",
  "that",
  "you",
  "your",
  "are",
  "the",
  "and",
  "for",
]);

/** The visitor's words (and the last question) as one search text, minus filler. */
export function supportSearchText(text: string): string {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !FILLER.has(w))
    .join(" ");
}

/** A question with case, spacing and punctuation ignored, to spot a visitor asking an FAQ question as written. */
export function normaliseQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface FaqEntry {
  slug: string;
  question: string;
  answer: string;
}

export interface FaqHit {
  slug: string;
  question: string;
  answer: string;
}

/**
 * The website support bot's FAQ (table `support_faqs`, loaded by the seed from
 * packages/db/prisma/data/support). Postgres full-text search ranks question and keywords above the
 * answer; the table is small (about a hundred rows), so no index is needed.
 */
@Injectable()
export class SupportFaqService {
  /** The whole FAQ and its vocabulary; rebuilt every few minutes so a reseed is picked up. */
  private cache: { faqs: FaqEntry[]; vocab: Set<string>; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async snapshot() {
    if (this.cache && Date.now() - this.cache.at < 5 * 60_000) return this.cache;
    const rows = await this.prisma.supportFaq.findMany({
      select: { slug: true, question: true, keywords: true, answer: true },
      orderBy: { slug: "asc" },
    });
    this.cache = {
      faqs: rows.map((r) => ({ slug: r.slug, question: r.question, answer: r.answer })),
      vocab: buildVocabulary(rows.flatMap((r) => [r.question, r.keywords, r.answer])),
      at: Date.now(),
    };
    return this.cache;
  }

  /** Every FAQ entry in a fixed order (so a model prompt built from it caches). */
  async all(): Promise<FaqEntry[]> {
    return (await this.snapshot()).faqs;
  }

  /** The best matches, with an FAQ question asked exactly as written always first (the chips do this). */
  async search(text: string, limit = 4): Promise<FaqHit[]> {
    const wanted = normaliseQuestion(text);
    const exact = (await this.all()).find((f) => normaliseQuestion(f.question) === wanted);
    const found = await this.fullText(text, limit);
    return exact ? [exact, ...found.filter((h) => h.slug !== exact.slug)].slice(0, limit) : found;
  }

  private async fullText(text: string, limit: number): Promise<FaqHit[]> {
    const query = toOrQuery(
      correctText(supportSearchText(text), (await this.snapshot()).vocab),
      16,
    );
    if (!query) return [];
    return this.prisma.$queryRaw<FaqHit[]>`
      SELECT f.slug, f.question, f.answer
      FROM support_faqs f,
        to_tsquery('english', ${query}) q,
        LATERAL (
          SELECT setweight(to_tsvector('english', f.question), 'A')
            || setweight(to_tsvector('english', f.keywords), 'A')
            || setweight(to_tsvector('english', f.answer), 'C') AS doc
        ) d
      WHERE d.doc @@ q
      ORDER BY ts_rank(d.doc, q) DESC, f.slug
      LIMIT ${limit}`;
  }
}
