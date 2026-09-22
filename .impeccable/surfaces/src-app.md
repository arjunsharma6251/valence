---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: ["src/components"]
---

# Surface brief: Valence app (all routes under src/app)

Scope: the whole authenticated-or-anonymous app shell and its seven screens (home, practice, mock, review, part2, question detail, sign-in). Visitor mode: Operate. Audience: USNCO students on phone and laptop equally; job: answer questions, review misses, take mocks, get Part II graded. Constraints: one column, four destinations, system fonts, one accent, light/dark by system, WCAG AA, motion only for feedback, no gamification, chemistry rendering untouched.

## Direction contract

THESIS: Valence is a native-feeling utility in the Apple Notes / Health tradition: the question is the content and the interface is grouped, hairlined furniture around it. It refuses the SaaS-dashboard arrangement (cards of icon + heading + text, eyebrow labels, gradient buttons) and the "study app" arrangement (mascots, streak chips, confetti).

OWN-WORLD: iOS grouped-table language on the web. Light: #f2f2f7 ground, #ffffff inset groups with 14px radius and 1px hairline row separators inset from the leading edge. Dark: #000000 ground, #1c1c1e groups, #2c2c2e fills. One accent, system blue (#0a7aff / #0a84ff), used for the primary action, selection, and the current tab only. Semantic green/red/orange for correct/wrong/rough. Type: system stack at Apple's fixed scale (Large Title 34/700, Title 22/700, Headline 17/600, Body 17, Subhead 15, Footnote 13, Caption 12), -0.02em on titles. Controls: 50px filled capsule primary, tinted capsule secondary, 44px list rows with trailing chevrons, native-style segmented control. Icons: authored 24px stroke SVG set, one weight. Depth: hairlines first; a single soft shadow (0 1px 2px + 0 8px 24px -12px) only on the sticky bars.

STORY: A student opens the app and sees, in one column, what is due and what is weak, then one tap puts a question on screen. They answer with a tap or a key, the row fills green or red within 100ms, the explanation slides in below, Enter brings the next. They leave knowing exactly what to study next, and nothing on screen tried to entertain them.

FIRST VIEWPORT (home, 375px): top bar with the wordmark and account glyph. Large Title "Summary". A grouped list of the four destinations as 44px rows (icon, name, live status such as "12 due" or "Rough 30/60", chevron); Practice is the first row and the one filled capsule button "Practice" sits directly under the group as the primary action. Below: "Weakest topics" group with a hairline bar per row; "Prediction" group with the score at Title size and a 30-day bar chart. New users see, instead of stats, a three-row group explaining Practice, Review, and Mock. Bottom tab bar on phone; on desktop the four destinations become a segmented pill in the top bar.

FORM: Canon, the category standard for Apple-quality utilities, chosen by the user in the direction round (standing exit; no concept-seed roll). Reference bar: Apple Notes, Apple Health, Apple Reminders. Seed key: none (canon route).

Signature interaction: the answer row's feedback fill and checkmark spring (180ms ease-out, reduced-motion → instant), followed by the explanation group rising 240ms. Nothing else animates on load.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
