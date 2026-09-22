"""`draft-explanations`: one Batches API request per question -> Explanation[] JSON."""

from __future__ import annotations

import base64
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
Every $...$ span must be valid KaTeX: balanced braces, no double superscripts (write $E^{\\circ}_{1}$ not $E^\\circ_1^{x}$), mhchem arrows and formulas only inside \\ce{...}, no \\to inside \\ce.
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


FIGURES_DIR = Path(__file__).resolve().parents[3] / "public" / "figures"


def _prompt(q: Question) -> str:
    opts = "\n".join(f"({o.label}) {o.text_md}" for o in q.options)
    official = f"\nOfficial one-line solution: {q.acs_solution_md}" if q.acs_solution_md else ""
    fig = "\n(The question's figure is attached as an image; answer options that read 'Shown in the figure' are drawings in it.)" if q.figure_url else ""
    return (
        f"Question:\n{q.stem_md}\n\n{opts}\n\nCorrect answer: {q.correct_option}{official}{fig}\n\n"
        "Return body_md (step-by-step explanation), distractor_notes with keys A, B, C, D, and concept_ref (a short concept name)."
    )


def _content(q: Question) -> list[dict] | str:
    """User content: the prompt, preceded by the figure image when the question has one."""
    if q.figure_url:
        png = FIGURES_DIR / Path(q.figure_url).name
        if png.is_file():
            data = base64.standard_b64encode(png.read_bytes()).decode()
            return [{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": data}}, {"type": "text", "text": _prompt(q)}]
    return _prompt(q)


def _params(q: Question, schema: dict) -> MessageCreateParamsNonStreaming:
    return MessageCreateParamsNonStreaming(
        model=DRAFT_MODEL,
        max_tokens=12000,
        thinking={"type": "adaptive"},
        system=SYSTEM,
        messages=[{"role": "user", "content": _content(q)}],
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": schema}},
    )


def submit(questions: list[Question]) -> str:
    schema = strict_schema(DraftExplanation)
    requests = [Request(custom_id=q.id, params=_params(q, schema)) for q in questions]
    batch = client().messages.batches.create(requests=requests)
    print(f"[draft] submitted batch {batch.id} with {len(requests)} requests", file=sys.stderr)
    return batch.id


def _draft_direct(q: Question, today: str) -> Explanation | None:
    """Non-batch fallback for the handful of requests a batch failed on."""
    params = _params(q, strict_schema(DraftExplanation))
    msg = client().messages.create(**params)
    text = next((b.text for b in msg.content if b.type == "text"), "")
    try:
        draft = DraftExplanation.model_validate_json(text)
    except ValueError as e:
        print(f"[draft] {q.id}: direct retry failed ({e})", file=sys.stderr)
        return None
    return Explanation(question_id=q.id, body_md=draft.body_md, distractor_notes=draft.distractor_notes.model_dump(), concept_ref=draft.concept_ref, verified=False, author="claude-batch-draft", updated_at=today)  # type: ignore[arg-type]


def wait(batch_id: str, poll_seconds: int = 60) -> None:
    c = client()
    while True:
        try:
            b = c.messages.batches.retrieve(batch_id)
        except Exception as e:  # noqa: BLE001 — transient network errors while polling
            print(f"[draft] poll error, retrying: {e}", file=sys.stderr)
            time.sleep(poll_seconds)
            continue
        if b.processing_status == "ended":
            print(f"[draft] ended: {b.request_counts}", file=sys.stderr)
            return
        print(f"[draft] {b.processing_status}: {b.request_counts.processing} processing", file=sys.stderr)
        time.sleep(poll_seconds)


def _download_results(batch_id: str) -> list[dict]:
    """Fallback for the SDK's streaming results reader, which fails on some
    batches with 'Bad file descriptor': fetch the JSONL file in one request."""
    import os

    import httpx2  # vendored by the SDK, ships its own CA bundle

    headers = {"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"}
    for line in os.environ.get("ANTHROPIC_CUSTOM_HEADERS", "").split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip()] = v.strip()
    r = httpx2.get(f"https://api.anthropic.com/v1/messages/batches/{batch_id}/results", headers=headers, timeout=300)
    r.raise_for_status()
    return [json.loads(line) for line in r.text.splitlines() if line.strip()]


def _results(batch_id: str) -> list[dict]:
    try:
        return [r.model_dump() for r in client().messages.batches.results(batch_id)]
    except Exception as e:  # noqa: BLE001
        print(f"[draft] results stream error ({e}); downloading the file instead", file=sys.stderr)
        return _download_results(batch_id)


def collect(batch_id: str, questions: list[Question]) -> list[Explanation]:
    by_id = {q.id: q for q in questions}
    today = dt.date.today().isoformat()
    out: list[Explanation] = []
    for result in _results(batch_id):
        qid = result["custom_id"]  # key by custom_id, never by position
        if qid not in by_id:
            continue
        res = result["result"]
        if res["type"] != "succeeded":
            print(f"[draft] {qid}: {res['type']}", file=sys.stderr)
            continue
        msg = res["message"]
        if msg.get("stop_reason") == "refusal":
            print(f"[draft] {qid}: refused", file=sys.stderr)
            continue
        text = next((b["text"] for b in msg["content"] if b.get("type") == "text"), "")
        try:
            draft = DraftExplanation.model_validate_json(text)
        except ValueError as e:
            print(f"[draft] {qid}: bad JSON ({str(e).splitlines()[0]})", file=sys.stderr)
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
    all_questions = [Question.model_validate(q) for q in json.loads(questions_json.read_text())]
    existing: list[Explanation] = [Explanation.model_validate(e) for e in json.loads(out.read_text())] if out.exists() else []
    have = {e.question_id for e in existing}
    questions = all_questions if resume else [q for q in all_questions if q.id not in have]
    if not questions:
        print(f"{out.name}: all {len(have)} questions already have drafts")
        return
    if existing and not resume:
        print(f"[draft] {len(have)} drafts exist; submitting the {len(questions)} still missing", file=sys.stderr)
    batch_id = resume or submit(questions)
    (out.parent / f".batch-{out.stem}.txt").write_text(batch_id)
    wait(batch_id)
    explanations = collect(batch_id, questions)
    explanations = sorted({e.question_id: e for e in [*existing, *explanations]}.values(), key=lambda e: e.question_id)
    questions = all_questions
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps([e.model_dump() for e in explanations], indent=2, ensure_ascii=False) + "\n")
    missing = {q.id for q in questions} - {e.question_id for e in explanations}
    if missing:
        today = dt.date.today().isoformat()
        from concurrent.futures import ThreadPoolExecutor

        todo = [q for q in questions if q.id in missing]
        print(f"[draft] filling {len(todo)} missing draft(s) with direct calls", file=sys.stderr)
        with ThreadPoolExecutor(max_workers=6) as ex:
            explanations += [e for e in ex.map(lambda q: _draft_direct(q, today), todo) if e]
        explanations.sort(key=lambda e: e.question_id)
        out.write_text(json.dumps([e.model_dump() for e in explanations], indent=2, ensure_ascii=False) + "\n")
        missing = {q.id for q in questions} - {e.question_id for e in explanations}
    print(f"wrote {len(explanations)} explanations to {out}")
    if missing:
        print(f"{len(missing)} question(s) without a draft: {sorted(missing)}")


def run_draft_all(questions_dir: Path, out_dir: Path) -> None:
    """Incremental drafting for every real exam file: only questions without a
    draft are submitted, so this is safe to re-run after a failure."""
    from concurrent.futures import ThreadPoolExecutor

    files = sorted(p for p in questions_dir.glob("20*.json"))

    def one(f: Path) -> None:
        try:
            run_draft(f, out_dir / f.name, None)
        except Exception as e:  # noqa: BLE001
            print(f"[draft] {f.name} failed: {e}", file=sys.stderr)

    with ThreadPoolExecutor(max_workers=len(files)) as ex:
        list(ex.map(one, files))
