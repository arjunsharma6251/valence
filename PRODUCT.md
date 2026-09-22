# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: high-school students preparing for the USNCO local exam, 3–12 weeks out, self-studying. They use Valence about equally on a phone (short evening sessions, often low light) and on a laptop at a desk (longer sessions, keyboard shortcuts). Secondary: national-level students (top ~1,000) practicing Part II free response. Later: returning competitors and club coaches. Anti-persona: AP Chemistry students wanting general review; the content stays olympiad-level.

## Product Purpose

Free, adaptive USNCO practice. Students answer questions with instant feedback and real explanations, see which topics they are weak on, review misses on a spaced schedule, take timed mock exams with a score prediction, and get Part II free-response answers graded against a rubric. Success is retention (users with 5+ sessions), not signups; target 500 weekly actives at the March 2027 local exam and a credible product-and-data narrative.

## Positioning

The only free tool that grades USNCO Part II free response, and the only one with a mastery model: every question is structured text (not an image) so it can be tagged, searched, and used to pick the next question for this student. Incumbents (usnco-quizzes.web.app, CODS PDFs, Madra) are static banks with no memory.

## Operating Context

- Four destinations: Practice, Mock, Review, Part II. Progress lives on the home screen.
- Anonymous use works fully (localStorage); sign-in merges history to Supabase.
- Keyboard on desktop: 1–4 answer, Enter next, E explanation, F flag.
- Content is public exam-derived material plus an original seed set; ACS attribution and a "not affiliated" notice are required on every screen.
- Grading is an LLM call with a 5/day cap and a monthly spend cap; the "paused" state must be graceful.

## Capabilities and Constraints

- Stack: Next.js 16 App Router, TypeScript, Tailwind v4 tokens, KaTeX + mhchem for chemistry. Deployed on Vercel at https://www.usevalence.app.
- Chemistry rendering is sacred: equations, formulas, states, and units must read exactly like a printed exam. Never stylize KaTeX output beyond size and color inheritance.
- Design constraints from the scope: one column, one primary action per screen, mobile-first at 375px, light and dark following the system with a manual toggle, WCAG AA including rendered chemistry and figures (invert line art in dark mode), tap targets ≥44px, system font stack, one accent color, motion only for feedback, no modals between questions, no gamification (streaks, confetti, badges, mascots, playful copy).
- Every action gives feedback within 100ms; grading is the one slow action and shows progress and an estimate.
- Errors are recoverable and specific; a failed grade never loses typed text.
- Undecided: final product name (Valence is the working name; avoid "USNCO" in it), domain.

## Brand Commitments

- Name: Valence (working).
- Standing preference (2026-09-21): the app should sit alongside Apple-quality utilities (Apple Notes / Health level of restraint): system feel, precise details, soft depth, minimal but stylish. Execute that convention at full fidelity rather than inventing a novel visual world.
- Arjun's taste: graceful over brutalist; hairlines, pills, soft radii and elevation, tinted washes; orchestrated, reduced-motion-aware motion used only where it conveys state.

## Evidence on Hand

- 80 original USNCO-style multiple-choice questions and 4 Part II problems in /content (marked as original, not real exam content).
- No real exam content imported yet; no logo; no testimonials, user counts, or endorsements. Do not fabricate any.

## Product Principles

1. The question is the product: everything on screen serves reading and answering it.
2. Familiar over clever: a category-fluent student should trust every control instantly.
3. Progress is shown, never celebrated.
4. Zero setup: the first session works with no account and no choices.
5. Honest about uncertainty: predictions are labeled rough, AI grades are labeled AI, drafts are labeled draft.

## Accessibility & Inclusion

WCAG AA contrast in both themes, including chemistry and figures. Full keyboard operation on desktop. Reduced-motion preference respected. Screen-reader-legible answer feedback (live region).
