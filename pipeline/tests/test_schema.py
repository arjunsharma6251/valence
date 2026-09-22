import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from valence_pipeline.csvio import AnswerRow, QuestionRow, write_answers, write_questions
from valence_pipeline.importer import build_questions, import_hint
from valence_pipeline.schema import Explanation, Question, load_topics, question_id


def _question(**overrides) -> dict:
    base = dict(
        id="2024-L-01",
        year=2024,
        level="local",
        number=1,
        stem_md="Which is a strong acid?",
        figure_url=None,
        topic_id="equilibrium",
        subtopic="acid-base equilibria",
        est_percent_correct=0.7,
        correct_option="B",
        options=[{"label": l, "text_md": t} for l, t in zip("ABCD", ["HF", "HCl", "HCN", "CH3COOH"])],
        acs_solution_md=None,
        source="test",
        verified_answer=True,
    )
    base.update(overrides)
    return base


def test_valid_question_parses() -> None:
    q = Question.model_validate(_question())
    assert q.id == "2024-L-01"


def test_question_rejects_bad_option_labels() -> None:
    bad = _question(options=[{"label": l, "text_md": "x"} for l in "ABC"])
    with pytest.raises(ValidationError):
        Question.model_validate(bad)


def test_question_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        Question.model_validate(_question(difficulty=3))


def test_explanation_requires_all_four_notes() -> None:
    with pytest.raises(ValidationError):
        Explanation(
            question_id="2024-L-01",
            body_md="...",
            distractor_notes={"A": "", "B": ""},
            concept_ref="acids",
            verified=False,
            author="t",
            updated_at="2026-09-21",
        )


def test_topics_load_from_repo() -> None:
    ids = {t.id for t in load_topics()}
    assert "stoichiometry" in ids and len(ids) == 10


def test_question_id_format() -> None:
    assert question_id(2024, "local", 7) == "2024-L-07"
    assert question_id(2023, "national", 60) == "2023-N-60"


def test_import_refuses_without_answers(tmp_path: Path) -> None:
    write_questions(tmp_path / "questions.csv", [QuestionRow(number=1, stem_md="s", option_a="a", option_b="b", option_c="c", option_d="d", topic_id="kinetics")])
    write_answers(tmp_path / "answers.csv", [AnswerRow(number=1)])
    with pytest.raises(SystemExit):
        build_questions(tmp_path, 2024, "local")


def test_import_builds_valid_json(tmp_path: Path) -> None:
    write_questions(tmp_path / "questions.csv", [QuestionRow(number=1, stem_md="s", option_a="a", option_b="b", option_c="c", option_d="d", topic_id="kinetics", subtopic="rate laws")])
    write_answers(tmp_path / "answers.csv", [AnswerRow(number=1, correct_option="d", percent_correct="55")])
    qs = build_questions(tmp_path, 2024, "local")
    assert qs[0].correct_option == "D"
    assert qs[0].est_percent_correct == 0.55
    json.dumps([q.model_dump() for q in qs])  # serializable
    assert 'import q2024Local from "../../../content/questions/2024-local.json"' in import_hint(Path("content/questions/2024-local.json"))
