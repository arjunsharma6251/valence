# USNCO exams: format, sources, attribution

## Format (what the pipeline expects)

| Exam | Questions | Time | Notes |
| --- | --- | --- | --- |
| Local Section Exam (March) | 60 multiple choice, 4 options (A–D) | 110 min | Score = number correct, no guessing penalty. Questions run roughly in topic blocks of ~6. Periodic table + physical-constants sheet printed in the PDF. ~10,000 students. |
| National Exam Part I (April) | 60 multiple choice, 4 options | 90 min | Same structure as local, harder. Explicitly "loosely grouped into 10 sets of 6 items; each set corresponds to a different chemistry topic". ~1,000 students. |
| National Exam Part II | 8 free-response problems with sub-parts | 105 min | Partial credit; written explanations and calculations. Topics: stoichiometry, equilibrium, thermodynamics, electrochemistry, kinetics, reaction prediction, bonding, organic. |
| National Exam Part III | 2 lab practical tasks | 90 min | Out of scope for Valence v1. |

The ten Part I topic blocks, in ACS's official order (questions 1–6, 7–12, … 55–60):
1 Stoichiometry/Solutions · 2 Descriptive/Laboratory · 3 States of Matter · 4 Thermodynamics · 5 Kinetics · 6 Equilibrium · 7 Oxidation–Reduction · 8 Atomic Structure/Periodicity · 9 Bonding/Molecular Structure · 10 Organic/Biochemistry.
`content/topics.json` lists the topics in this order with `block` and `questions` fields.
The block order is a strong prior for `topic_id` during extraction (question 1–6 → block 1, …), but the extractor must still classify each question, because ACS sometimes shuffles or merges blocks.

## Sources

ACS publishes every past exam as a PDF under one CDN path. Naming has been stable since at least 2014:

```
https://www.acs.org/content/dam/acsorg/education/students/highschool/olympiad/pastexams/
  {year}-usnco-local-exam.pdf               # 60 MC + key (recent years include the key at the end)
  {year}-usnco-local-exam-key.pdf           # separate key (older years)
  {year}-usnco-national-exam-part-i.pdf     # 60 MC
  {year}-usnco-national-exam-part-ii.pdf    # 8 FR + rubric-style solutions
  {year}-usnco-national-exam-part-iii.pdf   # lab (ignored)
  {year}-usnco-national-exam-key.pdf        # keys for Part I (+ solutions), older years
```

The index page is https://www.acs.org/education/olympiad/prepare-for-exams/past-exams.html.

**Bot protection.** acs.org is behind Imperva/Incapsula. `curl`, `requests`, and headless fetches get a JavaScript challenge (an HTML page with status 200 or 403), and a burst of requests blocks the whole IP for a while ("Error 15"). Download the PDFs in a normal browser, one at a time, and drop them in `pipeline/exams/` (git-ignored). Do not script the download.

## Scope for Valence v1 (the "10-year set")

Local exams 2016–2025 and National Part I 2016–2025 (~1,200 MC), plus National Part II 2016–2025 (~80 problems). Add 2026 when its key is published.

## Attribution and reuse

Every imported question carries `source` = `"USNCO {year} {Local Section Exam | National Exam Part I | National Exam Part II}, Q{n}. © American Chemical Society"` and the app shows it under the explanation and in the footer notice ("Not affiliated with ACS").

Open question from the product scope, still open: read the ACS terms of use for the past exams before the imported set goes public (the page itself was unreachable while the IP was blocked). Existing community sites (usnco-quizzes.web.app, CODS) republish the same material non-commercially with attribution; Valence follows the same practice and removes content immediately on request.

## Running the pipeline on a real exam

```
cd pipeline && uv sync
uv run valence-pipeline extract exams/2024-usnco-local-exam.pdf --year 2024 --level local --out work/2024-local
uv run valence-pipeline review work/2024-local           # fix questions.csv; fill answers.csv from the key
uv run valence-pipeline import work/2024-local --out ../content/questions/2024-local.json
uv run valence-pipeline draft-explanations ../content/questions/2024-local.json --out ../content/explanations/2024-local.json
```
Then add the two import lines to `src/lib/content/index.ts`, copy figures to `public/figures/`, run `npm test`.
Record time-per-exam here (M0 exit criterion):

| Exam | Extract | Review | Import | Total |
| --- | --- | --- | --- | --- |
| | | | | |

## ACS Terms of Use (read 2026-09-22, https://www.acs.org/terms.html)

Relevant clauses, quoted:

- "ACS invites you to view, use and share a copy of the materials obtained from any Services for non-commercial purposes."
- Prohibited: "Modify, alter, or create derivative works from, transfer, re-sell, or otherwise distribute any of the material contained in or on the Services or Content without prior written permission from ACS."
- Prohibited: "Use or upload our Content or Services into external, artificial intelligence tools or technologies" (other than ACS's own AI features).
- Prohibited: "Use, copy, or distribute any graphics, photographs or other visual elements obtained through the Services separately from the accompanying text without the prior express written consent of ACS."

What this means for Valence:

1. Republishing the exam questions as structured, re-typed content with explanations is a derivative work and a redistribution; the terms require **prior written permission from ACS**.
2. Running the PDFs through Claude for extraction or explanation drafting is an upload to an external AI tool, which the terms prohibit outright. The pipeline's `extract` and `draft-explanations` commands must not be run on ACS PDFs until permission is in hand.
3. Local, non-AI processing (reading the PDFs, parsing the answer keys with `keys.py`) is ordinary personal use.

Paths forward, in order of preference:

- **Ask ACS.** Write to the USNCO office (olympiad@acs.org) describing Valence (free, non-commercial, attributed, educational) and requesting written permission to reproduce past local and national exam questions with original explanations. Existing sites like usnco-quizzes.web.app may already have this; ask them too.
- **Link, don't copy.** A "Past exams" page that indexes ACS's own PDFs by year with our topic map and key-derived statistics (percent-correct per question is in the national keys) adds real value without reproducing a question.
- **Original questions.** Keep growing the original seed set, written to the same ten-block blueprint and difficulty curve (the percent-correct data tells us the curve). This is what the app runs on today.

Decision owner: Arjun. Until decided, the 42 PDFs stay in `pipeline/exams/` (git-ignored) for personal study and key parsing only.
