# USNCO exams: format, sources, attribution

## Format (what the pipeline expects)

| Exam | Questions | Time | Notes |
| --- | --- | --- | --- |
| Local Section Exam (March) | 60 multiple choice, 4 options (A–D) | 110 min | Score = number correct, no guessing penalty. Questions run roughly in topic blocks of ~6. Periodic table + physical-constants sheet printed in the PDF. ~10,000 students. |
| National Exam Part I (April) | 60 multiple choice, 4 options | 90 min | Same structure as local, harder. Explicitly "loosely grouped into 10 sets of 6 items; each set corresponds to a different chemistry topic". ~1,000 students. |
| National Exam Part II | 8 free-response problems with sub-parts | 105 min | Partial credit; written explanations and calculations. Topics: stoichiometry, equilibrium, thermodynamics, electrochemistry, kinetics, reaction prediction, bonding, organic. |
| National Exam Part III | 2 lab practical tasks | 90 min | Out of scope for Valence v1. |

The ten Part I topic blocks map onto `content/topics.json` in this order (ACS's usual sequence):
stoichiometry · states-of-matter · thermodynamics · kinetics · equilibrium · redox · atomic-structure · bonding · descriptive · organic.
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
