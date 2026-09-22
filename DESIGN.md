---
name: Valence
description: iOS grouped-table language on the web for a free USNCO practice utility; one accent, system type, feedback-only motion.
colors:
  ground: "#f2f2f7"
  group: "#ffffff"
  fill: "#e5e5ea"
  fill-2: "#d1d1d6"
  label: "#1c1c1e"
  label-2: "#6e6e73"
  label-3: "#8e8e93"
  sep: "rgba(60, 60, 67, 0.16)"
  sep-strong: "rgba(60, 60, 67, 0.32)"
  accent: "#4338ca"
  accent-on: "#ffffff"
  accent-tint: "rgba(67, 56, 202, 0.1)"
  accent-tint-2: "rgba(67, 56, 202, 0.18)"
  green: "#187a3c"
  green-tint: "rgba(52, 199, 89, 0.16)"
  red: "#c5281f"
  red-tint: "rgba(255, 59, 48, 0.14)"
  orange: "#a85a00"
  orange-tint: "rgba(255, 149, 0, 0.16)"
  selection: "rgba(67, 56, 202, 0.22)"
  ground-dark: "#000000"
  group-dark: "#1c1c1e"
  fill-dark: "#2c2c2e"
  fill-2-dark: "#3a3a3c"
  label-dark: "#f5f5f7"
  label-2-dark: "#98989f"
  label-3-dark: "#8e8e93"
  sep-dark: "rgba(84, 84, 88, 0.6)"
  sep-strong-dark: "rgba(84, 84, 88, 0.9)"
  accent-dark: "#a5b4fc"
  accent-on-dark: "#14123a"
  accent-tint-dark: "rgba(10, 132, 255, 0.18)"
  accent-tint-2-dark: "rgba(10, 132, 255, 0.28)"
  green-dark: "#30d158"
  green-tint-dark: "rgba(48, 209, 88, 0.18)"
  red-dark: "#ff453a"
  red-tint-dark: "rgba(255, 69, 58, 0.18)"
  orange-dark: "#ff9f0a"
  orange-tint-dark: "rgba(255, 159, 10, 0.18)"
  selection-dark: "rgba(10, 132, 255, 0.35)"
typography:
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.27
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  subhead:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  footnote:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.38
    letterSpacing: "normal"
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', ui-sans-serif, system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "normal"
  mono:
    fontFamily: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.92em"
    fontWeight: 400
rounded:
  capsule: "9999px"
  group: "14px"
  control: "12px"
  field: "10px"
  segment: "8px"
  icon-tile: "7px"
  kbd: "5px"
  bar: "2px"
spacing:
  2xs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-filled:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    typography: "{typography.body}"
    rounded: "{rounded.capsule}"
    padding: "0 20px"
    height: "50px"
  button-filled-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
  button-tinted:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent}"
    typography: "{typography.body}"
    rounded: "{rounded.capsule}"
    padding: "0 20px"
    height: "50px"
  button-tinted-hover:
    backgroundColor: "{colors.accent-tint-2}"
    textColor: "{colors.accent}"
  button-plain:
    textColor: "{colors.accent}"
    typography: "{typography.body}"
    rounded: "{rounded.capsule}"
    padding: "0 20px"
    height: "50px"
  button-plain-hover:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent}"
  button-destructive:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.red}"
    typography: "{typography.body}"
    rounded: "{rounded.capsule}"
    padding: "0 20px"
    height: "50px"
  button-compact:
    typography: "{typography.subhead}"
    rounded: "{rounded.capsule}"
    padding: "0 16px"
    height: "44px"
  group:
    backgroundColor: "{colors.group}"
    rounded: "{rounded.group}"
    padding: "0"
  group-header:
    textColor: "{colors.label-2}"
    typography: "{typography.footnote}"
    padding: "24px 16px 6px"
  row:
    backgroundColor: "{colors.group}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    padding: "10px 16px"
    height: "44px"
  row-hover:
    backgroundColor: "{colors.fill}"
  row-active:
    backgroundColor: "{colors.accent-tint}"
  row-icon-tile:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent}"
    rounded: "{rounded.icon-tile}"
    size: "28px"
  answer-row:
    backgroundColor: "{colors.group}"
    typography: "{typography.body}"
    padding: "12px 16px"
    height: "52px"
  answer-row-correct:
    backgroundColor: "{colors.green-tint}"
  answer-row-wrong:
    backgroundColor: "{colors.red-tint}"
  answer-badge-correct:
    backgroundColor: "{colors.green}"
    textColor: "#ffffff"
    rounded: "{rounded.capsule}"
    size: "28px"
  answer-badge-wrong:
    backgroundColor: "{colors.red}"
    textColor: "#ffffff"
    rounded: "{rounded.capsule}"
    size: "28px"
  segmented:
    backgroundColor: "{colors.fill}"
    rounded: "{rounded.control}"
    padding: "2px"
  segmented-option:
    textColor: "{colors.label-2}"
    typography: "{typography.subhead}"
    rounded: "{rounded.segment}"
    padding: "0 12px"
    height: "44px"
  segmented-option-selected:
    backgroundColor: "{colors.group}"
    textColor: "{colors.label}"
  tag-neutral:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label-2}"
    typography: "{typography.caption}"
    rounded: "{rounded.capsule}"
    padding: "2px 8px"
  tag-accent:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.accent}"
    typography: "{typography.caption}"
    rounded: "{rounded.capsule}"
    padding: "2px 8px"
  tag-green:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green}"
    typography: "{typography.caption}"
    rounded: "{rounded.capsule}"
    padding: "2px 8px"
  tag-red:
    backgroundColor: "{colors.red-tint}"
    textColor: "{colors.red}"
    typography: "{typography.caption}"
    rounded: "{rounded.capsule}"
    padding: "2px 8px"
  tag-orange:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.orange}"
    typography: "{typography.caption}"
    rounded: "{rounded.capsule}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "44px"
  input-focus:
    backgroundColor: "{colors.group}"
  kbd:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label-2}"
    typography: "{typography.caption}"
    rounded: "{rounded.kbd}"
    padding: "0 4px"
    height: "20px"
  top-bar:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.label}"
    typography: "{typography.headline}"
    padding: "0 16px"
    height: "52px"
  tab-bar:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.label-2}"
    padding: "0"
    height: "56px"
  tab-bar-active:
    textColor: "{colors.accent}"
---

# Design System: Valence

## Overview

**Creative North Star: "The Settings Screen for Chemistry"**

Valence is a native-feeling utility in the Apple Notes / Health / Reminders tradition, rebuilt on the web. The question is the content; everything else is grouped, hairlined furniture around it. A screen is one column, at most 640px wide, made of inset white groups on a pale grey ground, each group a stack of 44px rows separated by 1px hairlines inset from the leading edge. There is one page heading (a Large Title that hands off to the top bar when it scrolls away), one primary action, and four destinations, ever.

The palette is system-derived and nearly monochrome: one accent (system blue) reserved for the primary action, the selected state, and the current tab; green, red and orange appear only as answer feedback and status. Type is the platform's own sans at Apple's fixed scale, with tabular numerals wherever a number can change. Depth is conveyed by hairlines and translucency, not shadow. Motion exists only to confirm what the student just did: an answer row fills, a glyph springs in, the explanation rises. Nothing animates on load.

The build refuses the SaaS-dashboard arrangement (icon + heading + text cards, gradient buttons, a second accent) and the study-app arrangement (mascots, streaks, confetti, playful copy). Progress is shown, never celebrated.

**Key Characteristics:**
- Inset grouped lists on a grey ground; hairline separators, never full-bleed borders between rows
- One accent, used for action, selection and the current tab only; semantic colors carry answer feedback only
- System font stack at Apple's fixed seven-step scale; tabular numerals for anything countable
- Every control is at least 44px tall; the primary capsule is 50px
- Two full token sets (light, dark), switched by system preference or a manual pin on `data-theme`
- Motion is feedback-only: 150ms fill, 180ms glyph spring, 240ms rise; reduced-motion collapses all of it to instant
- Rendered chemistry (KaTeX + mhchem) is never restyled beyond inherited color and a 1.04em size bump

## Colors

A system-grey utility palette with a single blue accent; the semantic trio (green, red, orange) exists to say correct, wrong, rough.

### Primary
- **System Blue** (`accent`; light `#0066cc`, dark `#0a84ff`): the filled primary capsule, tinted secondary capsule text, the selected row and segment, the active tab, the account glyph, in-text links, and the focus ring. The light value is deliberately deeper than iOS's `#0a7aff` so white-on-accent and accent-on-white both clear WCAG AA; the dark value is iOS's own.
- **Accent Tint** (`accent-tint`, `accent-tint-2`): the wash behind tinted buttons, the icon tile on a row, the selected desktop nav pill, and a chosen-but-unrevealed answer. `accent-tint-2` is the hover step of a tinted control.
- **Accent On** (`accent-on`): white text on a filled accent surface; also tints the `Kbd` hint inside a filled button at 20% opacity.

### Neutral
- **Ground** (`ground`; light `#f2f2f7`, dark `#000000`): the page background and, at 92% with backdrop blur, the sticky top bar, bottom tab bar, the mock timer bar and the Part II symbol bar. Also the browser theme-color.
- **Group** (`group`; light `#ffffff`, dark `#1c1c1e`): every inset group, a focused input, the selected segment, and skeleton blocks.
- **Fill** (`fill`, `fill-2`): the segmented-control track, resting inputs at 70%, row hover at 60% and row press at 100%, `Kbd` chips, the empty track of progress bars, the symbol-bar keys (hover to `fill-2`), and inline `code`.
- **Label** (`label`, `label-2`, `label-3`): primary text; secondary text (row details, group headers and footers, meta lines, placeholders, unselected segments); tertiary (chevrons and the search glyph only).
- **Separator** (`sep`, `sep-strong`): the hairline between rows and the border on sticky bars; the stronger step outlines the resting A–D answer badge.
- **Selection** (`selection`): text selection wash.

### Semantic
- **Green** (`green`, `green-tint`): correct answer row wash and badge, the "Correct" line, full-marks rubric text, a green Tag.
- **Red** (`red`, `red-tint`): wrong answer wash and badge, "Not quite", the due-count badge on the Review tab, a weak topic's percentage and bar, the destructive button, the timer under five minutes, error text, "Leave group".
- **Orange** (`orange`, `orange-tint`): the "rough" prediction Tag only.

### Named Rules
**The One Accent Rule.** Blue is the only chromatic color that is not a verdict. It marks the primary action, selection, the current tab, and links; it never decorates.

**The Verdict-Only Rule.** Green, red and orange say correct, wrong, rough (or due/danger). They never appear as a section color, an illustration, or a chart theme; a bar goes red only when the number it shows is weak (under 60%).

**The Two-Set Rule.** Every color token has a light value on `:root` and a dark value under `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` and `:root[data-theme="dark"]`. New colors are added to all three blocks or not at all; no component may hardcode a hex outside `src/lib/og.tsx` and the viewport theme-color.

## Typography

**Display Font:** system sans (`-apple-system, BlinkMacSystemFont, "SF Pro Text"`, falling through `system-ui`, Segoe UI, Roboto, Helvetica Neue, Arial)
**Body Font:** the same stack
**Label/Mono Font:** `ui-monospace, "SF Mono", Menlo, Consolas` for inline code and group join-codes

**Character:** the platform's own voice at Apple's fixed sizes. Nothing is fluid or clamped; hierarchy comes from weight and the seven steps, and titles tighten slightly (`-0.02em` on Large Title, `-0.01em` on Title and the wordmark).

### Hierarchy
- **Large Title** (700, 34px, 1.2, `-0.02em`): the one `h1` per screen ("Summary", "Account", "Search"); the mock's remaining time and final score. Registers its text with the top bar and hands off when scrolled under it.
- **Title** (700, 22px, 1.27, `-0.01em`): the predicted score and per-topic score denominators; the only step between Large Title and Headline.
- **Headline** (600, 17px, 1.3): the wordmark, the top-bar title that appears on scroll, the mock timer.
- **Body** (400, 17px, 1.45): the question stem and options (at `leading-relaxed`), row titles, button labels, input text.
- **Subhead** (400/500, 15px, 1.4): explanations and rubric feedback, compact button labels, segmented options, desktop nav pills, search results.
- **Footnote** (400/500, 13px, 1.38): group headers (uppercase, `0.04em`), group footers, row details, meta lines, the A–D badge letters, source attribution, the site footer.
- **Caption** (600, 12px, 1.33): Tags, `Kbd` hints, mock grid cells.
- Tab-bar labels sit below the scale at 10px/500, with an 11px due badge; this is the native tab-bar size and is confined to `TabBar`.

### Named Rules
**The Fixed Scale Rule.** Type uses only the seven named steps (`text-large-title` through `text-caption`). No arbitrary `text-[Npx]` outside the tab bar; no `clamp()`.

**The Tabular Number Rule.** Any number that can change (scores, counts, timers, ratings, percentages, question positions) carries `.tnum`; body text does not.

**The Untouched KaTeX Rule.** Rendered chemistry inherits color and size only (`.md .katex { font-size: 1.04em }`); no weight, color, letter-spacing or font override ever targets KaTeX output. Figures invert in dark mode with `filter: invert(0.92) hue-rotate(180deg)` on a white plate.

## Layout

One column. `main` is `max-width: 640px`, centered, with 16px side padding and 20px top padding; the top bar and footer share the same 640px measure. The screen stacks: optional Large Title (4px above, 16px below), then groups. A `GroupHeader` sits 24px above its group (0 when first on the page) and 6px above the group's top edge; a `GroupFooter` sits 6px below. Groups are separated by their headers, not by margin.

Rows are `min-height: 44px` with 16px horizontal and 10px vertical padding and a 12px gap between icon, text and trailing value. Answer rows are 52px with 12px vertical padding. Hairlines are inset 16px from the leading edge, or 56px when rows carry a 28px icon tile.

Bars: the top bar is 52px, sticky, `z-30`; the mock timer bar sticks under it at `top: 52px`. On phones the tab bar is fixed at the bottom, 56px plus `env(safe-area-inset-bottom)`, four equal cells; the footer pads for it. From `md` (768px) the tab bar disappears and the four destinations become a pill group in the top bar (36px pills, 2px gap). Segmented controls drop from 44px to 36px options at `md`; `Kbd` hints render only from `md`.

Spacing rhythm is 4px-based: 2px (segment track inset, Tag vertical padding), 4, 6, 8, 10, 12, 16, 20, 24. The buttons row under a question uses an 8px gap; the primary capsule under the home group sits 12px below it and spans full width.

## Elevation & Depth

Hairlines first. Depth is conveyed by the ground/group tonal step (grey page, white groups), by 1px `sep` borders, and by translucent blurred bars (`ground` at 92% with `backdrop-blur-xl`) that let content scroll under them. There are no card shadows and no hover lifts.

### Shadow Vocabulary
- **Bar** (`--bar-shadow`: `0 1px 2px rgba(0,0,0,0.05), 0 8px 24px -12px rgba(0,0,0,0.18)`; dark `0.5` / `0.7` alphas): the one ambient shadow, reserved for fixed or sticky bars. In the shipped build it is applied to the Part II symbol bar; the top bar, tab bar and mock timer bar use hairline plus blur alone.
- **Segment** (`0 1px 2px rgba(0,0,0,0.08)`): the selected segment of a segmented control, matching the native lift.

### Named Rules
**The Hairline-Not-Shadow Rule.** A group never carries a shadow or an outer border; it is a white shape on grey. Shadows belong to bars and the selected segment only.

**The Feedback Motion Rule.** The only animations are responses to an action: the answer row's background fills over 150ms, the check or cross springs in over 180ms (`scale(0.7)→1`, `cubic-bezier(0.22,1,0.36,1)`), and the explanation, flag list, grade, or score group rises over 240ms (`translateY(6px)→0`, `cubic-bezier(0.2,0.7,0.2,1)`). Row hover and press transition background over 100–150ms; the top-bar title fades over 150ms. Nothing animates on page load, and `prefers-reduced-motion` reduces every duration to 0.01ms.

## Shapes

Capsules and soft rectangles. Buttons, Tags, the A–D badges, progress bars, the desktop nav pills and the due badge are full capsules. Groups are 14px; the segmented-control track is 12px (10px from `md`) with 8px segments inside; text inputs and textareas are 10px (the sign-in email field uses the 12px control radius); mock grid cells and symbol keys are 8px; the row icon tile is 7px; `Kbd` is 5px; trend bars are 2px; the focus ring rounds to 10px. The only hard edges are the hairlines themselves and the full-bleed sticky bars. Figures get 10px corners.

Icons are an authored 24px set (`src/components/icons.tsx`) at a single 1.8 stroke with round caps and joins, drawn in `currentColor`; the check and cross use 2.2 for legibility at 16px, and the active tab thickens to 2.4. Rows show icons inside a 28px accent-tinted tile at 18px; chevrons are 18px in `label-3`.

## Components

### Buttons
- **Character:** iOS capsule buttons; the label is the whole affordance, no icons except the flag and share glyphs at 18px.
- **Shape:** full capsule (`9999px`), `min-height: 50px`, 20px horizontal padding, Body 600. Compact: 44px, 16px padding, Subhead 600, `white-space: nowrap`.
- **Filled:** accent background, `accent-on` text. Hover `brightness(1.05)`, press `brightness(0.95)`.
- **Tinted:** `accent-tint` background, accent text. Hover `accent-tint-2`.
- **Plain:** accent text, no background. Hover `accent-tint`, press `accent-tint-2`.
- **Destructive:** `red-tint` background, red text. Hover `brightness(0.95)`.
- **All states:** press `scale(0.985)`; disabled 40% opacity with pointer events off; transition `background-color, filter, transform` over 150ms; focus-visible shows the global 2px accent outline offset 2px.
- **Kbd:** a 20px `fill`/`label-2` chip at Caption 500 inside the button on desktop; `onAccent` swaps to `accent-on` at 20% for filled buttons.

### Groups and Rows
- **Group:** `group` background, 14px radius, `overflow: hidden`, no border, no shadow. Children stack with a 1px `sep` hairline inset 16px (56px with `insetIcon`).
- **GroupHeader:** Footnote 500 in `label-2`, uppercase with `0.04em` tracking (`caps={false}` for sentence case), optional trailing Footnote text; 24px above, 6px below.
- **GroupFooter:** Footnote in `label-2`, `leading-snug`, 6px below the group.
- **Row:** 44px minimum, Body title (truncated) over an optional Footnote `label-2` detail; optional trailing Body `label-2` tabular value; chevron in `label-3` whenever it links. Interactive rows hover `fill` at 60% and press `fill` at 100% over 100ms; `active` rows carry `accent-tint`. A row may host a control (the theme `Segmented`) or a `Tag`.
- **Select row:** a native `select` styled as a row value (`.row-select`: transparent, right-aligned `label-2`, chevron rotated 90°).

### Tags
- **Style:** capsule, 2px × 8px padding, Caption 600. Tones: neutral (`fill`/`label-2`, "draft", "no mock"), accent ("Resume"), green, red ("12 due"), orange ("rough").
- **State:** static; Tags never act as filters.

### Segmented Control
- **Track:** `fill`, 12px radius (10px at `md`), 2px inner padding, `role="radiogroup"`.
- **Option:** 44px × ≥44px (36px tall at `md`), 12px padding, 8px radius, Subhead 500 in `label-2`, hover `label`. Selected: `group` background, `label` text, the segment shadow. Transitions background, shadow and color over 150ms.

### Inputs / Fields
- **Style:** `fill` at 70%, 10px radius (12px on the sign-in email field), Body text, 44px minimum (50px on sign-in), 16px horizontal padding (12px on textareas); placeholders in `label-2`; the accent caret. Search adds an 18px `label-3` glyph inset 12px.
- **Focus:** background becomes `group` and a 2px accent ring appears; `outline: none` on the field itself.
- **Textarea:** `min-height: 96px`, `resize: vertical`, `leading-relaxed`. Drafts persist; a failed grade never clears the text.
- **Error:** Footnote red text below the field with `role="alert"`.

### Navigation
- **Top bar:** 52px, sticky, `ground` at 92% with `backdrop-blur-xl` and a bottom `sep` hairline. Wordmark "Valence" in Headline 600 at `-0.01em` links home; the account glyph (22px) in accent sits at the trailing edge; both are 44px targets. On phones a centered Headline title fades in (150ms) when the Large Title scrolls under the bar. From `md`, four Subhead 500 pills (36px, capsule): current in `accent-tint`/accent, others `label-2` with `fill` at 70% on hover.
- **Tab bar (phone only):** fixed, 56px plus safe-area, `ground` 92% blurred with a top hairline, four equal cells. Each cell is a 24px icon over a 10px/500 label; current is accent with a 2.4 stroke, others `label-2` at 1.8. Review carries a red capsule due-count (18px, 11px/600 white, "99+" cap) offset 6px right of center.
- **Mock timer bar:** sticks under the top bar; Headline 600 tabular time (red under 5:00), Footnote answered count, and the controls.
- **Part II symbol bar:** fixed above the tab bar (bottom-0 at `md`), the one surface carrying `--bar-shadow`; 36px `fill` keys with 8px radius at Subhead.

### Question Card (signature)
- **Meta line:** Footnote `label-2`, 24px tall, 8px below: bold tabular position, topic name (truncated), and "Local/National YYYY" trailing.
- **Stem:** Body at `leading-relaxed` directly on the ground; no card, no border. Figures 10px-rounded on a white plate that inverts in dark mode.
- **Options:** a `Group` with `insetIcon` hairlines, 16px above the stem. Each option is a 52px button: a 28px capsule badge (Footnote 600, resting `sep-strong` outline in `label-2`), Body option text at `leading-relaxed`, and a `Kbd` 1–4 on desktop. Chosen-unrevealed: `accent-tint` row, accent badge. Revealed correct: `green-tint` row, green badge with a 16px check springing in. Revealed wrong choice: `red-tint` row, red badge with a cross. Background fills over 150ms; the badge transitions background and border over 150ms.
- **Verdict:** Body 600 line in green ("Correct") or red ("Not quite. The answer is B.") rising 12px below the group.
- **Action row:** compact buttons 8px apart: tinted "Explanation/Hide" (E), plain "Flag" (F), plain "Challenge" (share glyph, label hidden below `sm`), and the filled "Next" (↵) pushed to the trailing edge.
- **Explanation:** rises as a stack of `GroupHeader` + `Group`: optional "Official solution", then "Explanation" (with a neutral "draft" Tag when unverified) holding Subhead body text, one row per option (letter in a 16px column; correct in green, the chosen wrong in red, others `label-2`), an accent "Concept:" link row, and a Footnote source line with "Open question page".
- **Flag list:** a rising `Group` of 44px accent Body rows, no modal.
- **Keys:** 1–4 answer, Enter next, E explanation, F flag; ignored while typing in a field.

### Share Cards (generated)
- 1200 × 630 Satori renders (`src/lib/og.tsx`): light tokens only, `ground` frame with 56px padding, a `group` panel at 24px radius, hairline `borderTop` between rows, 34px capsule option badges outlined in `sep`. The wordmark is text ("Valence", 30px 700, `-0.5` tracking); there is no logo, no pill or Tag above the content, and no dark variant. Type is Noto Sans 400/700 with Noto Sans Math for chemistry symbols; sub- and superscripts are drawn structurally by `ChemText` (66% size, shifted ±0.2/0.4em) rather than as Unicode glyphs. Every container is `display: flex`; numbers are stringified. The mock card sets its score at 112px/700 with `-4` tracking and per-topic capsule bars (8px, `#e5e5ea` track, accent fill, red under 60%).

## Do's and Don'ts

### Do:
- **Do** build every screen as one column of `Group`s on the ground, headed by one `LargeTitle`, with one filled capsule as the primary action.
- **Do** keep every interactive element at least 44px tall (50px for the primary capsule, 52px for answer rows) and give it hover, press, focus-visible and disabled states.
- **Do** use the seven fixed type steps and `.tnum` on any number that can change.
- **Do** add every new color to all three token blocks (light, dark media, dark pin) and reference it through the `--color-*` Tailwind theme.
- **Do** use hairlines (`sep`, inset 16px or 56px) to separate rows and `ground` at 92% with `backdrop-blur-xl` for bars.
- **Do** animate only in response to an action, with `animate-rise` (240ms) for content that appears and `animate-spring` (180ms) for a verdict glyph; transition `background-color` on rows, never `color` on elements whose text color is inherited (Chrome theme-flip repaint).
- **Do** render chemistry through `Md` and leave KaTeX output alone; wrap figures in `.figure-invert`.
- **Do** keep share cards on the light token set with a text wordmark and structural sub/superscripts.

### Don't:
- **Don't** introduce a second accent, gradients, or a colored section theme; blue is for action and selection, green/red/orange are verdicts.
- **Don't** put a shadow, outer border, or hover lift on a `Group`; the only shadows are the bar shadow and the selected-segment lift.
- **Don't** compose icon + heading + text feature cards, eyebrow labels above content, or hero sections; `GroupHeader` is the only small-caps label and it sits above a group, never above a headline.
- **Don't** add gamification: no streak chips, confetti, badges, mascots, or celebratory copy. "Correct" is the whole reward.
- **Don't** animate on page load or stagger content in; skeletons pulse, nothing else moves until the student acts.
- **Don't** use arbitrary pixel type sizes, fluid `clamp()` type, a webfont, or a display face; the system stack is the brand.
- **Don't** open a modal between questions; flag reasons and explanations are inline groups.
- **Don't** hardcode hex values in components; the share-card palette in `src/lib/og.tsx` is the one sanctioned exception because Satori cannot read CSS custom properties.


## Revision 2026-09-21 (evening): typography, accent, desktop layout, motion

- Type: display face is Bricolage Grotesque (Large Titles, the wordmark, tile names, big numbers); body/UI face is Hanken Grotesk. Both self-hosted through next/font with `--font-display` and `--font-hanken`; the system stack is the fallback only.
- Accent: indigo (#4338ca light, #a5b4fc dark with #14123a on-accent text) replaces system blue so the selection state no longer collides with the "Apple default" reading. Tints derive from it; green/red/orange stay verdict-only.
- Layout: the shell is 1040px on desktop. Home shows the four destinations as tiles (2×2 on phones, 4-across from md) and Topics/Prediction side by side; Practice, Review, and the question page split into question (left) and a sticky explanation column (right, 400px) from lg; Mock puts the question grid in the right column. Form-like screens (Account, Search, Feedback, Part II list, mock lobby/report) stay 640px via `Narrow`.
- Motion: entrance stagger (`.stagger`, 360ms rise, 40ms apart) on Home, lists, and options; `CountUp` on scores; bars draw in (`.grow`, 700ms); tiles lift on hover; the answer feedback grammar is unchanged. Everything collapses to 0.01ms under prefers-reduced-motion.


## Revision 2026-09-21 (night): editorial re-skin after Fermata

Arjun asked for SF Pro-level elegance, less copy, and Fermata's graphic language. The iOS grouped-table look is replaced by Fermata's "forensic editorial" language; the structure (four destinations, split practice, mock grid) is unchanged.

- Canvas: warm off-white #faf8f5 (dark: #151311); ink #16130f (dark #f1ece4); ink-soft, grey, hairline `--line #eae5db`. No filled groups anywhere: lists are hairline-separated rows on the canvas; inputs are hairline-bordered.
- Type: system stack first (SF Pro on Apple) with Inter Variable as the fallback; Fraunces Variable for the wordmark ("valence." with an accent period), page titles, destination names and big numbers; JetBrains Mono at 11.5px uppercase, 0.04em for section labels, meta rows, option letters, chips and the tab bar.
- Accent: one rare cobalt (#1d4ed8 light, #8fb0ff dark) for the wordmark period, the active nav underline, links on hover, the selected answer wash and the review badge. Green/red remain verdict-only. Primary button is ink on canvas; secondary is a hairline outline.
- Chrome: canvas-colored top bar that earns a whisper of shadow once scrolled; phone tab bar on canvas with a hairline top and mono labels. Radii 3–6px.
- Copy: every group footer cut to one clause or removed; Home has no title and no explanatory list, only the four destinations (numbered 01–04 in mono) and, once there is data, Topics and Prediction side by side.
- Gotcha recorded: base resets and helper classes (`.mono`, `.serif`, `.list`) live in `@layer base` / `@layer components`; anything unlayered would out-rank Tailwind utilities (the Next button lost its text color that way).
