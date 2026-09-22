from pathlib import Path

from valence_pipeline.csvio import (
    AnswerRow,
    QuestionRow,
    read_answers,
    read_questions,
    write_answers,
    write_questions,
)


def test_questions_round_trip(tmp_path: Path) -> None:
    rows = [
        QuestionRow(
            number=2,
            page=1,
            stem_md="What is the pH of $0.010\\ \\text{M}$ $\\ce{HCl}$?",
            option_a="1.0",
            option_b="2.0",
            option_c="12.0",
            option_d="0.010",
            topic_id="equilibrium",
            subtopic="acid-base equilibria",
            notes="confidence=medium",
        ),
        QuestionRow(number=1, page=1, stem_md='A "quoted", comma stem', option_a="a", option_b="b", option_c="c", option_d="d"),
    ]
    path = tmp_path / "questions.csv"
    write_questions(path, rows)
    back = read_questions(path)
    assert [r.number for r in back] == [1, 2]  # sorted on write
    assert back[1] == rows[0]
    assert back[0].stem_md == 'A "quoted", comma stem'


def test_answers_round_trip_keeps_blank_cells(tmp_path: Path) -> None:
    path = tmp_path / "answers.csv"
    write_answers(path, [AnswerRow(number=1), AnswerRow(number=2, correct_option="c", percent_correct="0.62")])
    back = read_answers(path)
    assert back[1].correct_option == ""
    assert back[1].percent_correct == ""
    assert back[2].correct_option == "C"  # normalized to upper case
    assert back[2].percent_correct == "0.62"
