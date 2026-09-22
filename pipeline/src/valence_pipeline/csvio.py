"""CSV round-trip for the human review step.

Two files live in a work directory:
  questions.csv — one row per question, produced by `extract`, fixed by a human
  answers.csv   — one row per question number, filled by a human from the official key
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field, asdict
from pathlib import Path

QUESTION_COLUMNS = [
    "number",
    "page",
    "stem_md",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "figure_url",
    "topic_id",
    "subtopic",
    "notes",
]

ANSWER_COLUMNS = ["number", "correct_option", "acs_solution_md", "percent_correct"]


@dataclass
class QuestionRow:
    number: int
    stem_md: str
    option_a: str = ""
    option_b: str = ""
    option_c: str = ""
    option_d: str = ""
    figure_url: str = ""
    topic_id: str = ""
    subtopic: str = ""
    page: int = 0
    notes: str = ""

    def options(self) -> list[str]:
        return [self.option_a, self.option_b, self.option_c, self.option_d]


@dataclass
class AnswerRow:
    number: int
    correct_option: str = ""
    acs_solution_md: str = ""
    percent_correct: str = ""  # kept as text so an empty cell survives the round trip


def write_questions(path: Path, rows: list[QuestionRow]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=QUESTION_COLUMNS)
        w.writeheader()
        for r in sorted(rows, key=lambda r: r.number):
            w.writerow(asdict(r))


def read_questions(path: Path) -> list[QuestionRow]:
    with path.open(newline="", encoding="utf-8") as f:
        out = []
        for raw in csv.DictReader(f):
            out.append(
                QuestionRow(
                    number=int(raw["number"]),
                    page=int(raw.get("page") or 0),
                    stem_md=raw.get("stem_md", ""),
                    option_a=raw.get("option_a", ""),
                    option_b=raw.get("option_b", ""),
                    option_c=raw.get("option_c", ""),
                    option_d=raw.get("option_d", ""),
                    figure_url=raw.get("figure_url", ""),
                    topic_id=raw.get("topic_id", ""),
                    subtopic=raw.get("subtopic", ""),
                    notes=raw.get("notes", ""),
                )
            )
        return out


def write_answers(path: Path, rows: list[AnswerRow]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=ANSWER_COLUMNS)
        w.writeheader()
        for r in sorted(rows, key=lambda r: r.number):
            w.writerow(asdict(r))


def read_answers(path: Path) -> dict[int, AnswerRow]:
    with path.open(newline="", encoding="utf-8") as f:
        out: dict[int, AnswerRow] = {}
        for raw in csv.DictReader(f):
            n = int(raw["number"])
            out[n] = AnswerRow(
                number=n,
                correct_option=(raw.get("correct_option") or "").strip().upper(),
                acs_solution_md=raw.get("acs_solution_md", "") or "",
                percent_correct=(raw.get("percent_correct") or "").strip(),
            )
        return out
