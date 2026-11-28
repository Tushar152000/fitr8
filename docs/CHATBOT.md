# Website support chatbot ("Ask FITR8")

The help chat on every public page of fitr8.com. A visitor asks a question; the bot answers from our
FAQ and nothing else. No sign-in, nothing stored about the visitor. Built 2026-11-28. Not the same
thing as the signed-in AI **coach** (`modules/coach`, Premium, docs/ARCHITECTURE.md §3.4).

- **Answers:** `packages/db/prisma/data/support/*.md` (102 questions, 10 files). Human-readable copy of the
  first version: `docs/CHATBOT-FAQ.md`. The `.md` files in `data/support/` are the source of truth.
- **API:** `POST /api/support/chat` in `apps/api/src/modules/support` (public, rate-limited).
- **Model access:** `apps/api/src/modules/ai/support/` (the `SUPPORT_ANSWERER` port: Claude, OpenAI, mock).
- **Widget:** `apps/web/src/app/(marketing)/_components/support-chat.tsx`, mounted in the marketing layout.

## 1. Add the AI keys (what your colleague needs)

The bot uses the **same two settings as photo scanning and the coach**: `AI_PROVIDER` and the matching
API key. There is no separate key. Without a key it runs on a **mock** that returns the best keyword
match word for word, which is fine for UI work but does not understand rewording, typos or Hindi.

### Local

1. Edit `.env` in the repo root (never commit it). One of:

   ```bash
   # OpenAI
   AI_PROVIDER="openai"
   OPENAI_API_KEY="sk-..."

   # or Anthropic (Claude)
   AI_PROVIDER="anthropic"
   ANTHROPIC_API_KEY="sk-ant-..."
   ```

2. Restart the API (`pnpm stop:all && pnpm start:lite`, or restart `pnpm dev`).
3. Open the site (http://localhost:3000), click **Ask FITR8** and try the checks in §5.

Switching the provider also switches photo scans and the coach to the real model, and it spends real
credits.

### Production (Cloud Run)

Production already has the secrets mounted for photo scans (docs/DEPLOY.md, docs/RELEASE.md). The bot
needs nothing new:

| What                    | Where                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Provider                | GitHub repo variable `AI_PROVIDER` (`openai` by default, or `anthropic`)                                                       |
| The key                 | Secret Manager secret `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`), mounted by `.github/workflows/ci-cd.yml`                      |
| Rotate or set a new key | `printf %s "$KEY" \| gcloud secrets versions add OPENAI_API_KEY --data-file=- --project=fitlens-prod`, then the next deploy    |
| First-time setup        | `infra/gcp/setup.sh` asks for the key (hidden input)                                                                           |
| Per-visitor cost cap    | env `SUPPORT_DAILY_LIMIT` (default 30 questions per IP per day; in memory per instance), plus the strict per-minute rate limit |

Models are chosen in code, not env: `apps/api/src/modules/ai/models.ts` (`support`): Claude Haiku 5.5
on Anthropic, `gpt-6-luna` on OpenAI. Changing one is a reviewed code change.

## 2. How a question is answered

```
visitor question (≤ 500 chars) + last 6 turns
  → greeting / thanks / off-topic?  → fixed reply, no model call
  → keyword search over the FAQ (typo-tolerant)  → best matches
  → AI model reads the WHOLE FAQ (cached prompt) and answers from it
        ├─ answer + up to 3 follow-up questions (only real FAQ questions are kept)
        └─ NO_ANSWER → "I'm not sure, email us" + a "Talk to the team" button
```

- **With a key** the model sees all 102 answers (about 9k tokens, prompt-cached, so it costs very little
  per question) and finds the right one even when the visitor misspells or rewords. It replies in the
  visitor's language and says `NO_ANSWER` when the FAQ doesn't cover the question, instead of guessing.
- **Without a key (mock)** only the top keyword matches are used; no match means "not sure".
- The prompt lives in `apps/api/src/modules/ai/support/prompt.ts` (frozen text: every edit invalidates
  the prompt cache for everyone, so change it deliberately).
- The only thing stored is an `ai_calls` row (type `SUPPORT_CHAT`: model, tokens, time). Never the
  visitor's words.

### What the widget does

- Suggestion chips on the empty chat, and after each answer (real FAQ questions, tap to ask).
- The chat is kept in the tab's `sessionStorage`: it survives page changes and refreshes, and "new chat"
  (the circular arrow) clears it.
- Links in answers work: Privacy Policy, Terms, emails and web addresses.
- **Talk to the team** (shown when the bot has no answer) opens `/contact?message=…` with the visitor's
  question already in the message box.

## 3. Change or add answers

1. Edit the matching file in `packages/db/prisma/data/support/`. Format (one `##` heading per question,
   answer under it, optional last `Keywords:` line for words people type that the question doesn't contain):

   ```markdown
   ## Can I use FITR8 on a tablet?

   Yes, sign in with the same account. Phone is the best experience.
   Keywords: ipad, tablet, big screen
   ```

2. Load it: `pnpm db:seed` (production: the `fitlens-migrate` job runs the seed on deploy). Removing an
   entry from the files removes it from the bot on the next seed. The bot picks up changes within about
   5 minutes (the FAQ is cached in memory).
3. Rules: plain words, 2 to 4 sentences, true to what the app does today, no medical advice, prices exactly
   as in docs/PREMIUM.md. A question must be unique (its slug is made from it).

Facts still to confirm before launch are listed at the top of `docs/CHATBOT-FAQ.md` (for example the
landing page says 3 free photo scans a day, but the billing rules say photo scans are Premium only; the
bot follows the billing rules).

## 4. Safety

- Answers only from the FAQ; the prompt forbids inventing features, prices or dates and tells the model to
  say `NO_ANSWER` instead.
- Not a doctor: medical, pregnancy, injury and under-18 questions get "general guidance only, ask a
  professional". The visitor's message is wrapped as data and the prompt ignores instructions inside it.
- The widget tells visitors not to share passwords or health details.
- Abuse: strict per-minute rate limit on the route, `SUPPORT_DAILY_LIMIT` per IP per day, 500-character
  questions, 6 turns of history.

## 5. Check it works

```bash
pnpm --filter @fitr8/api test        # unit + e2e (needs Docker for the e2e database)
```

By hand, in the chat, with a real key set:

| Ask                                  | Expect                                                |
| ------------------------------------ | ----------------------------------------------------- |
| "is it on adnroid"                   | The iPhone and Android answer (typo understood)       |
| "can i get a routine"                | The weekly workout plan (Premium) answer              |
| "kya ye free hai"                    | A free-plan answer in Hindi or Hinglish               |
| "and how do I cancel?" after pricing | The cancellation answer (follow-up understood)        |
| "what's the weather?" / "jj"         | "I'm not sure" with a **Talk to the team** button     |
| tap **Talk to the team**             | `/contact` opens with the question in the message box |
| refresh the page                     | The chat is still there                               |

## 6. Not built yet

- Thumbs up/down on answers, and logging unanswered questions to find FAQ gaps (needs a privacy-policy
  line: visitor text would be stored).
- Streaming replies (word by word). Replies are one plain response today.
- The same bot inside the mobile app (Help screen). The endpoint is ready for it.
