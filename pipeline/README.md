# Valence content pipeline

Offline, re-runnable pipeline that turns a USNCO exam PDF into the JSON the app imports from `/content`. Human review happens in a spreadsheet between extraction and import.

```
Exam PDF → page images → LLM vision extraction → questions.csv + answers.csv
        → human fix + verify → import to content/questions/<year>-<level>.json
        → batch explanation drafts → content/explanations/<year>-<level>.json
        → contributor verification (in the app)
```

## Setup

```bash
cd pipeline
uv sync
export ANTHROPIC_API_KEY=sk-ant-...   # or `ant auth login`
uv run pytest                          # no API calls in tests
```

Models are env-overridable: `VALENCE_EXTRACT_MODEL` (default `claude-opus-5`, vision extraction) and `VALENCE_DRAFT_MODEL` (default `claude-sonnet-5`, explanation drafts via the Batches API at half price).

## Commands

All commands run as `uv run valence-pipeline <cmd>` from `pipeline/`.

### 1. `extract`

```bash
uv run valence-pipeline extract ~/exams/2024-local.pdf --year 2024 --level local --out work/2024-local
```

Renders each page at 150 dpi (`work/2024-local/pages/`), sends each page image to Claude with a structured-output schema, and writes:

- `questions.csv` — one row per question: number, page, stem_md, option_a–d, figure_url, topic_id, subtopic, notes. The `notes` column flags low-confidence extractions and option-count problems.
- `answers.csv` — one row per question with empty `correct_option`, `acs_solution_md`, `percent_correct` for you to fill from the official key.
- `figures/<year>-<L|N>-<nn>.png` — cropped figures for questions that need one (`figure_url` is set to `/figures/<file>`; copy the folder to `public/figures/` in the app).
- `raw.json` — the untouched model output, for debugging.

### 2. Review loop (the part that takes time)

1. Open `questions.csv` in a spreadsheet. Fix stems and options, check chemistry notation (`$\ce{...}$`), re-crop or redraw any bad figure, and fix `topic_id` (must be an id from `content/topics.json`).
2. Fill `answers.csv` from the official ACS key: `correct_option` (A–D), the one-line `acs_solution_md`, and `percent_correct` if ACS published it (`0.62` or `62` both work; blank means 0.5).
3. Run the checker until it is clean:

```bash
uv run valence-pipeline review work/2024-local
```

It lists missing/duplicate numbers, empty options, unknown topics, extractor notes, and questions without an answer. Exit code 1 while problems remain.

### 3. `import`

```bash
uv run valence-pipeline import work/2024-local --out ../content/questions/2024-local.json
```

Validates every row against the schema (mirrors `src/lib/content/types.ts`), refuses to write if any question lacks a `correct_option`, then prints the `import` line to add to `src/lib/content/index.ts`.

### 4. `draft-explanations`

```bash
uv run valence-pipeline draft-explanations ../content/questions/2024-local.json --out ../content/explanations/2024-local.json
```

Submits one Batches API request per question, polls every 60 s, and writes `Explanation[]` with `verified: false`, `author: "claude-batch-draft"`. The batch id is saved to `content/explanations/.batch-2024-local.txt`; if the poll dies, resume with `--resume <batch_id>`. Results are keyed by `custom_id`, never position. Drafts are shown with a "draft" label in the app until a contributor verifies them.

## Time per exam (M0 exit criterion)

Record the wall-clock time for each stage on the first three exams so the M5 backfill can be budgeted.

| Exam | Extract | Review + answers | Import + drafts | Notes |
| --- | --- | --- | --- | --- |
| | | | | |

## Layout

```
pipeline/
  pyproject.toml
  src/valence_pipeline/
    cli.py        # argparse entry point
    schema.py     # pydantic models mirroring types.ts, topic loader
    csvio.py      # questions.csv / answers.csv round-trip
    llm.py        # Anthropic client, model ids, strict JSON schema helper
    extract.py    # PDF → images → vision extraction → CSVs + figures
    review.py     # problem checker
    importer.py   # CSVs → Question[] JSON
    explain.py    # Batches API explanation drafts
  tests/
  work/           # per-exam work dirs (gitignored)
```
