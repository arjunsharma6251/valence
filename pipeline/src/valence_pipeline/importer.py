"""`import`: reviewed CSVs -> content/questions/<year>-<level>.json."""

from __future__ import annotations

import json
from pathlib import Path

from .csvio import read_answers, read_questions
from .schema import OPTION_LABELS, Level, Question, QuestionOption, question_id, topic_ids, validate_topic_ids

DEFAULT_SOURCE = "USNCO {year} {level_name} exam, question {number}. © American Chemical Society; reproduced for non-commercial practice."


def build_questions(work: Path, year: int, level: Level) -> list[Question]:
    rows = read_questions(work / "questions.csv")
    answers = read_answers(work / "answers.csv")
    level_name = "Local" if level == "local" else "National Part I"
    questions: list[Question] = []
    errors: list[str] = []
    for r in rows:
        a = answers.get(r.number)
        if a is None or a.correct_option not in OPTION_LABELS:
            errors.append(f"Q{r.number}: missing correct_option")
            continue
        pc = float(a.percent_correct) if a.percent_correct else 0.5
        if pc > 1:  # allow "62" meaning 62%
            pc /= 100
        try:
            questions.append(
                Question(
                    id=question_id(year, level, r.number),
                    year=year,
                    level=level,
                    number=r.number,
                    stem_md=r.stem_md,
                    figure_url=r.figure_url or None,
                    topic_id=r.topic_id,
                    subtopic=r.subtopic,
                    est_percent_correct=pc,
                    correct_option=a.correct_option,  # type: ignore[arg-type]
                    options=[QuestionOption(label=lab, text_md=t) for lab, t in zip(OPTION_LABELS, r.options())],
                    acs_solution_md=a.acs_solution_md or None,
                    source=DEFAULT_SOURCE.format(year=year, level_name=level_name, number=r.number),
                    verified_answer=True,
                )
            )
        except ValueError as e:
            errors.append(f"Q{r.number}: {e}")
    errors += validate_topic_ids(questions, topic_ids())
    if errors:
        raise SystemExit("import refused:\n  " + "\n  ".join(errors))
    return sorted(questions, key=lambda q: q.number)


def import_hint(out: Path) -> str:
    stem = out.stem  # e.g. 2024-local
    parts = stem.split("-")
    var = "q" + "".join(p.capitalize() for p in parts)  # q2024Local
    return (
        f'Add to src/lib/content/index.ts:\n'
        f'  import {var} from "../../../content/questions/{out.name}";\n'
        f"  ...and append {var} to the `questions` array (and the matching explanations file once drafted)."
    )


def run_import(work: Path, out: Path) -> None:
    meta = json.loads((work / "meta.json").read_text())
    questions = build_questions(work, int(meta["year"]), meta["level"])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps([q.model_dump() for q in questions], indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {len(questions)} questions to {out}")
    print(import_hint(out))
