"""`review`: summarize a work directory so the human knows what to fix."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

from .csvio import read_answers, read_questions
from .schema import OPTION_LABELS, topic_ids


def run_review(work: Path) -> int:
    """Print a summary; return the number of problems found."""
    qs = read_questions(work / "questions.csv")
    answers_path = work / "answers.csv"
    answers = read_answers(answers_path) if answers_path.exists() else {}
    valid_topics = topic_ids()
    problems: list[str] = []

    numbers = sorted(q.number for q in qs)
    if numbers:
        expected = list(range(numbers[0], numbers[-1] + 1))
        missing = sorted(set(expected) - set(numbers))
        if missing:
            problems.append(f"missing question numbers: {missing}")
    dupes = [n for n, c in Counter(numbers).items() if c > 1]
    if dupes:
        problems.append(f"duplicate question numbers: {sorted(dupes)}")

    for q in qs:
        empties = [lab for lab, text in zip(OPTION_LABELS, q.options()) if not text.strip()]
        if empties:
            problems.append(f"Q{q.number}: empty option(s) {empties}")
        if not q.stem_md.strip():
            problems.append(f"Q{q.number}: empty stem")
        if q.topic_id not in valid_topics:
            problems.append(f"Q{q.number}: unknown topic_id {q.topic_id!r}")
        if q.notes:
            problems.append(f"Q{q.number}: extractor note: {q.notes}")
        a = answers.get(q.number)
        if a is None or a.correct_option not in OPTION_LABELS:
            problems.append(f"Q{q.number}: no correct_option in answers.csv")
        elif a.percent_correct:
            try:
                float(a.percent_correct)
            except ValueError:
                problems.append(f"Q{q.number}: percent_correct is not a number: {a.percent_correct!r}")

    print(f"{len(qs)} questions in {work / 'questions.csv'}")
    print("\nPer topic:")
    for topic, n in sorted(Counter(q.topic_id for q in qs).items()):
        print(f"  {topic:20s} {n}")
    figs = sum(1 for q in qs if q.figure_url)
    print(f"\n{figs} questions reference a figure")
    if problems:
        print(f"\n{len(problems)} problem(s) to fix before import:")
        for p in problems:
            print(f"  - {p}")
    else:
        print("\nNo problems found. Ready for `import`.")
    return len(problems)
