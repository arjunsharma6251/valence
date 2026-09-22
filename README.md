# Valence

Free, adaptive practice for the USNCO (U.S. National Chemistry Olympiad): a structured question bank with step-by-step explanations, an Elo-style mastery model that picks what you should see next, spaced-repetition review, timed mock exams with a topic score report, and AI-graded Part II free response.

Working name. Not affiliated with or endorsed by the American Chemical Society.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest: content validation, Elo, SM-2, selection, mocks, grading helpers
npm run typecheck
npm run lint
npm run build
```

With no environment variables the app is fully usable: progress is stored in the browser, and the seed question bank ships in the bundle. Set variables from `.env.example` in `.env.local` to turn on accounts (Supabase), Part II grading (Anthropic), and analytics (PostHog).

## How it is put together

| Layer | Where | Notes |
| --- | --- | --- |
| Content | `content/*.json`, typed by `src/lib/content/types.ts` | Public, static, versioned in git. Imported explicitly in `src/lib/content/index.ts`. Chemistry in KaTeX + mhchem. |
| Rendering | `src/lib/render.ts` | Mini-markdown → HTML, KaTeX for math. Isomorphic. |
| Mastery | `src/lib/mastery.ts`, `predict.ts`, `select.ts` | Elo per topic, replayed from the attempt log. Prediction after 40 attempts, "rough" until 100. |
| Review | `src/lib/srs.ts` | SM-2. Missed questions are due immediately, then 1 d, 6 d, ×ease. |
| Mocks | `src/lib/mock.ts` | 60 questions drawn per topic; timer keyed to `started_at` so it survives refresh; one pause. |
| User state | `src/lib/store/` | localStorage first (anonymous id). Signed-in users mirror to Supabase via `/api/sync`; merge is a union by id. |
| Grading | `src/app/api/grade/route.ts`, `src/lib/grading.ts` | Anthropic SDK, structured output, rubric per sub-part. Daily cap, monthly spend cap, answer cache. |
| Accounts | `src/lib/supabase/`, `src/proxy.ts`, `src/app/auth/callback` | Google + magic link. RLS scopes every table to the user. |
| Analytics | `src/lib/analytics.ts` | PostHog behind `track()`. Page views, the named product events, optional session replay. |
| Database | `supabase/migrations/0001_init.sql` | Per-user tables, contributor edits, grading ledger, `metrics_summary` view. |
| Content pipeline | `pipeline/` (Python, uv) | PDF → page images → Claude vision extraction → review CSV → import → batch explanation drafts. See `pipeline/README.md`. |

### Pages

`/` home (progress, weak topics, prediction) · `/practice` · `/mock` · `/review` · `/part2` and `/part2/[id]` · `/q/[id]` question detail with contributor editor (`?c=1` renders it as a friend's challenge) · `/s/mock` shared score card · `/signin` (account, study groups, profile) · `/search` · `/feedback`.

Keyboard: `1–4` answer, `Enter` next, `E` explanation, `F` flag.

### Design

iOS grouped-table language on the web, built to the Apple Notes / Health bar: system font stack, one accent, hairline-separated inset groups, capsule buttons, light and dark by system with a manual toggle. Tokens live in `src/app/globals.css`; primitives in `src/components/ui.tsx`; the icon set in `src/components/icons.tsx`. Product truth is in `PRODUCT.md`, the visual system in `DESIGN.md`.

### Growth loops

| Loop | Where | How |
| --- | --- | --- |
| Shareable question links | every `/q/[id]` | Server-rendered page plus a generated Open Graph card (`opengraph-image.tsx`) so a pasted link previews as the question. |
| Challenge a friend | "Challenge" after answering | Share sheet / clipboard link to `/q/[id]?c=1`; the receiver answers in practice mode with no account, then flows into adaptive practice. |
| Mock score card | score report → "Share score card" | `/api/og/mock` renders a PNG from the score in the URL; shared as a file on phones, downloaded on desktop; `/s/mock` is the landing page. |
| Study groups | Account → Study group | Six-character codes; members compare answered / accuracy / last mock / weakest topic via a security-definer function (`supabase/migrations/0002_groups.sql`). Signed-in only. |

Events for all of these go to PostHog as `share`, `challenge_opened`, `group_created`, `group_joined`.

## Adding content

1. `cd pipeline && uv sync`, then follow `pipeline/README.md` to extract an exam, review the CSV, and import it to `content/questions/<year>-<level>.json`.
2. Add the import line the importer prints to `src/lib/content/index.ts`.
3. `uv run valence-pipeline draft-explanations …` to draft explanations (Batches API), then add that file too.
4. Copy any figures to `public/figures/`.
5. `npm test` validates the bundle (ids, topics, rubric sums, KaTeX).

The seed set (`content/*/seed-*.json`) is 80 original USNCO-style questions and 4 Part II problems written to exercise the product. They are marked as original in `source`.

## Deploy

Vercel: import the repo, set the env vars, done. Apply `supabase/migrations/*.sql` in order in the Supabase SQL editor and enable Google + email (magic link) providers with `https://<domain>/auth/callback` as a redirect URL.

## Metrics

`select * from metrics_summary;` in Supabase covers graded submissions, completed mocks, verified explanations, and monthly LLM spend. Weekly actives and sessions-per-user come from PostHog (`session_start`, `question_answered`, `mock_completed`, `frq_submitted`, `sign_up`).
