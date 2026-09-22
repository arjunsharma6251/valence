"""`draft-explanations`: one Batches API request per question -> Explanation[] JSON."""

from __future__ import annotations

import datetime as dt
import json
import sys
import time
from pathlib import Path

from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request
from pydantic import BaseModel

from .llm import DRAFT_MODEL, client, strict_schema
from .schema import Explanation, Question

SYSTEM = """You write explanations for USNCO (U.S. National Chemistry Olympiad) multiple-choice questions for strong high-school students.
Write in mini-markdown: inline math in $...$ (KaTeX with mhchem, e.g. $\\ce{H2O}$), **bold** sparingly, short paragraphs, '- ' for bullets. No HTML.
Be correct and concise. Show the calculation for numeric questions. The distractor note for the correct option should say why it is right; the others should name the specific error a student makes to land on that choice."""


class DistractorNotes(BaseModel):
    A: str
    B: str
    C: str
    D: str


class DraftExplanation(BaseModel):
    body_md: str
    distractor_notes: DistractorNotes
    concept_ref: str


def _prompt(q: Question) -> str:
    opts = "\n".join(f"({o.label}) {o.text_md}" for o in q.options)
    official = f"\nOfficial one-line solution: {q.acs_solution_md}" if q.acs_solution_md else ""
    return (
        f"Question:\n{q.stem_md}\n\n{opts}\n\nCorrect answer: {q.correct_option}{official}\n\n"
        "Return body_md (step-by-step explanation), distractor_notes with keys A, B, C, D, and concept_ref (a short concept name)."
    )


def submit(questions: list[Question]) -> str:
    schema = strict_schema(DraftExplanation)
    requests = [
        Request(
            custom_id=q.id,
            params=MessageCreateParamsNonStreaming(
                model=DRAFT_MODEL,
                max_tokens=4000,
                thinking={"type": "adaptive"},
                system=SYSTEM,
                messages=[{"role": "user", "content": _prompt(q)}],
                output_config={"format": {"type": "json_schema", "schema": schema}},
            ),
        )
        for q in questions
    ]
    batch = client().messages.batches.create(requests=requests)
    print(f"[draft] submitted batch {batch.id} with {len(requests)} requests", file=sys.stderr)
    return batch.id


def wait(batch_id: str, poll_seconds: int = 60) -> None:
    c = client()
    while True:
        b = c.messages.batches.retrieve(batch_id)
        if b.processing_status == "ended":
            print(f"[draft] ended: {b.request_counts}", file=sys.stderr)
            return
        print(f"[draft] {b.processing_status}: {b.request_counts.processing} processing", file=sys.stderr)
        time.sleep(poll_seconds)


def collect(batch_id: str, questions: list[Question]) -> list[Explanation]:
    by_id = {q.id: q for q in questions}
    today = dt.date.today().isoformat()
    out: list[Explanation] = []
    for result in client().messages.batches.results(batch_id):
        qid = result.custom_id  # key by custom_id, never by position
        if qid not in by_id:
            continue
        if result.result.type != "succeeded":
            print(f"[draft] {qid}: {result.result.type}", file=sys.stderr)
            continue
        msg = result.result.message
        if msg.stop_reason == "refusal":
            print(f"[draft] {qid}: refused", file=sys.stderr)
            continue
        text = next((b.text for b in msg.content if b.type == "text"), "")
        try:
            draft = DraftExplanation.model_validate_json(text)
        except ValueError as e:
            print(f"[draft] {qid}: bad JSON ({e})", file=sys.stderr)
            continue
        notes = draft.distractor_notes.model_dump()
        out.append(
            Explanation(
                question_id=qid,
                body_md=draft.body_md,
                distractor_notes=notes,  # type: ignore[arg-type]
                concept_ref=draft.concept_ref,
                verified=False,
                author="claude-batch-draft",
                updated_at=today,
            )
        )
    return sorted(out, key=lambda e: e.question_id)


def run_draft(questions_json: Path, out: Path, resume: str | None) -> None:
    questions = [Question.model_validate(q) for q in json.loads(questions_json.read_text())]
    batch_id = resume or submit(questions)
    (out.parent / f".batch-{out.stem}.txt").write_text(batch_id)
    wait(batch_id)
    explanations = collect(batch_id, questions)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps([e.model_dump() for e in explanations], indent=2, ensure_ascii=False) + "\n")
    missing = {q.id for q in questions} - {e.question_id for e in explanations}
    print(f"wrote {len(explanations)} explanations to {out}")
    if missing:
        print(f"{len(missing)} question(s) without a draft: {sorted(missing)}")
