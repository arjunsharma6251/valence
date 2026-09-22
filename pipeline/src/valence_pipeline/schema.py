"""Pydantic models mirroring src/lib/content/types.ts.

Keep these in sync with the TypeScript types; the JSON the pipeline writes is
imported by the Next.js app at build time.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Level = Literal["local", "national"]
OptionLabel = Literal["A", "B", "C", "D"]
OPTION_LABELS: tuple[OptionLabel, ...] = ("A", "B", "C", "D")

# repo root is three levels above this file's package: pipeline/src/valence_pipeline
REPO_ROOT = Path(__file__).resolve().parents[3]
TOPICS_PATH = REPO_ROOT / "content" / "topics.json"


class Topic(BaseModel):
    id: str
    name: str
    acs_category: str
    local_weight: int
    national_weight: int
    subtopics: list[str]


def load_topics(path: Path = TOPICS_PATH) -> list[Topic]:
    with path.open() as f:
        return [Topic.model_validate(t) for t in json.load(f)]


def topic_ids(path: Path = TOPICS_PATH) -> set[str]:
    return {t.id for t in load_topics(path)}


class QuestionOption(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: OptionLabel
    text_md: str


class Question(BaseModel):
    """One multiple-choice question, exactly as the app expects it."""

    model_config = ConfigDict(extra="forbid")
    polished: bool = False  # set by `polish`; ignored downstream

    id: str
    year: int
    level: Level
    number: int
    stem_md: str
    figure_url: str | None
    topic_id: str
    subtopic: str
    est_percent_correct: float = Field(ge=0.0, le=1.0)
    correct_option: OptionLabel
    options: list[QuestionOption]
    acs_solution_md: str | None
    source: str
    verified_answer: bool

    @field_validator("options")
    @classmethod
    def _four_options(cls, v: list[QuestionOption]) -> list[QuestionOption]:
        labels = [o.label for o in v]
        if labels != list(OPTION_LABELS):
            raise ValueError(f"options must be exactly A, B, C, D in order; got {labels}")
        return v

    @model_validator(mode="after")
    def _correct_in_options(self) -> "Question":
        if self.correct_option not in {o.label for o in self.options}:
            raise ValueError("correct_option is not one of the options")
        if not self.stem_md.strip():
            raise ValueError("stem_md is empty")
        return self


class Explanation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_id: str
    body_md: str
    distractor_notes: dict[OptionLabel, str]
    concept_ref: str
    verified: bool
    author: str
    updated_at: str

    @field_validator("distractor_notes")
    @classmethod
    def _all_four(cls, v: dict[str, str]) -> dict[str, str]:
        missing = set(OPTION_LABELS) - set(v)
        if missing:
            raise ValueError(f"distractor_notes missing {sorted(missing)}")
        return v


def question_id(year: int, level: Level, number: int) -> str:
    return f"{year}-{'L' if level == 'local' else 'N'}-{number:02d}"


def validate_topic_ids(questions: list[Question], valid: set[str]) -> list[str]:
    """Return a list of human-readable problems (empty if all topic ids are valid)."""
    return [
        f"{q.id}: unknown topic_id {q.topic_id!r}" for q in questions if q.topic_id not in valid
    ]
