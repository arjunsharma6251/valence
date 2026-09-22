"""`frq-extract`: a USNCO Part II PDF (problems followed by the official
solutions) -> content/frq/<year>-national.json.

The whole PDF goes to the model as a document block (text + page images), one
request per problem so outputs stay short; the document is prompt-cached so
the eight requests per exam share one upload. Sub-parts that cannot be
answered without an untranscribed figure are held out to work/frq-held.json
for review instead of shipping."""
from __future__ import annotations

import base64
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from pydantic import BaseModel, Field

from .llm import EXTRACT_MODEL, client
from .schema import load_topics

PROBLEMS_PER_EXAM = 8


class RubricLine(BaseModel):
    points: int = Field(ge=0, description="integer points; 0 means the line is informational and is dropped")
    criterion: str


class Part(BaseModel):
    label: str = Field(description='sub-part label as printed, e.g. "a", "b", "e(i)"')
    stem_md: str
    key_md: str = Field(description="the official solution for this sub-part, in mini-markdown, faithfully")
    rubric: list[RubricLine]
    max_points: int = Field(ge=1)
    needs_figure: bool = Field(description="true if the student cannot answer without a figure/graph/spectrum/structure image that is not transcribed in stem_md")
    drawing: bool = Field(description="true if the answer is a drawn structure, plot or diagram rather than text or numbers")


class Problem(BaseModel):
    number: int
    title: str = Field(description="4-8 word descriptive title, no problem number")
    topic_id: str
    weight_percent: int = Field(description="the bracketed percent/points printed after the problem number")
    intro_md: str = Field(description="shared context printed before the first sub-part; empty string if none")
    parts: list[Part]
    notes: str = Field(description="anything a reviewer should know: garbled math, missing figures, guessed points")


def _system() -> str:
    topics = "\n".join(f"- {t.id}: {t.name}" for t in load_topics())
    return f"""You transcribe one problem from a USNCO National Exam Part II booklet into structured data. The PDF contains the problems first and the official solutions ("Solutions", "Answers" or "Key") afterwards; use both.

Rules:
- Transcribe the problem statement and each sub-part's prompt verbatim. Do not paraphrase or shorten.
- key_md is the official solution for that sub-part, transcribed faithfully including the numbers and the reasoning. Where the text layer is garbled, read the page image. Do not add your own solution; if the official solution for a sub-part is only a drawing, describe the drawn answer precisely in words (structure name, connectivity, stereochemistry, what the plot shows).
- Chemistry in mini-markdown: inline $...$ with KaTeX + mhchem, e.g. $\\ce{{Cu(NO3)2 * n H2O}}$, $\\ce{{2 Cu^2+ + 5 I- -> 2 CuI + I3-}}$, $K_\\text{{sp}} = 2.7 \\times 10^{{-9}}$, $\\Delta H^\\circ_\\text{{rxn}}$. Small data tables become plain text lines. No HTML.
- Points: the problem's printed weight (e.g. [12%] or [12]) is its total points. Split it across sub-parts the way an ACS grader would (calculation-heavy and multi-step parts get more; a one-line explanation gets 1-2). max_points per part must be a positive integer and the parts must sum to weight_percent.
- Never invent, merge or renumber sub-parts: the parts list must be exactly the sub-parts printed in the problem. If your split does not sum to the weight, change the points on the parts that exist.
- Rubric: 1-4 lines per part, each with integer points summing exactly to that part's max_points. Each criterion names one thing the answer must contain (a correct equation, a numeric result with tolerance, a named concept in an explanation). Write them so a grader can check them against typed text.
- needs_figure: true only when the question depends on an image (spectrum, graph, unit-cell drawing, structure) that a student reading stem_md alone could not answer. Transcribe small tables and simple equations into stem_md instead of flagging them.
- drawing: true when the requested answer is a Lewis structure, organic structure, orbital diagram or plot.
- topic_id from: 
{topics}
"""


def _pdf_block(pdf: Path) -> dict:
    return {
        "type": "document",
        "source": {"type": "base64", "media_type": "application/pdf", "data": base64.standard_b64encode(pdf.read_bytes()).decode()},
        "cache_control": {"type": "ephemeral"},
    }


def extract_problem(pdf: Path, number: int, attempts: int = 2) -> Problem:
    for i in range(attempts):
        try:
            return _extract_problem(pdf, number)
        except Exception as e:  # noqa: BLE001 — validation or transient API errors; retry once
            if i == attempts - 1:
                raise
            print(f"  problem {number}: retrying after {type(e).__name__}", file=sys.stderr)
    raise AssertionError("unreachable")


def _extract_problem(pdf: Path, number: int) -> Problem:
    resp = client().messages.parse(
        model=EXTRACT_MODEL,
        max_tokens=12000,
        system=_system(),
        messages=[{"role": "user", "content": [_pdf_block(pdf), {"type": "text", "text": f"Extract problem {number} and its official solution."}]}],
        output_format=Problem,
    )
    if resp.parsed_output is None:
        raise RuntimeError(f"problem {number}: no structured output")
    u = resp.usage
    print(f"  problem {number}: in={u.input_tokens} cache_read={getattr(u, 'cache_read_input_tokens', 0)} cache_write={getattr(u, 'cache_creation_input_tokens', 0)} out={u.output_tokens}", file=sys.stderr)
    return resp.parsed_output


DRAWING_NOTE = " *Type the structure as a name, condensed formula or SMILES; describe plots in words.*"


def to_content(p: Problem, year: int) -> tuple[dict | None, list[dict]]:
    """Split into (shippable problem or None, held parts)."""
    held, parts = [], []
    for part in p.parts:
        if not part.label.strip() or not part.stem_md.strip():
            continue  # padding the model invented to make points sum; never ship it
        if part.needs_figure:
            held.append({"id": f"{year}-N-P{p.number}", "label": part.label, "stem_md": part.stem_md, "reason": "needs_figure"})
            continue
        parts.append({
            "label": part.label,
            "stem_md": part.stem_md + (DRAWING_NOTE if part.drawing else ""),
            "key_md": part.key_md,
            "rubric": [r.model_dump() for r in part.rubric if r.points > 0],
            "max_points": part.max_points,
        })
    if not parts:
        return None, held
    return {
        "id": f"{year}-N-P{p.number}",
        "year": year,
        "level": "national",
        "number": p.number,
        "title": p.title,
        "topic_id": p.topic_id,
        "intro_md": p.intro_md,
        "parts": parts,
        "source": f"USNCO {year} National Part II exam, problem {p.number}. © American Chemical Society; reproduced for non-commercial practice.",
    }, held


def check(p: Problem) -> list[str]:
    errs = []
    valid = {t.id for t in load_topics()}
    if p.topic_id not in valid:
        errs.append(f"P{p.number}: unknown topic {p.topic_id}")
    if sum(x.max_points for x in p.parts) != p.weight_percent:
        errs.append(f"P{p.number}: parts sum {sum(x.max_points for x in p.parts)} != weight {p.weight_percent}")
    for x in p.parts:
        if sum(r.points for r in x.rubric) != x.max_points:
            errs.append(f"P{p.number}{x.label}: rubric sum {sum(r.points for r in x.rubric)} != max {x.max_points}")
    return errs


def run_frq_extract(pdf: Path, year: int, out: Path, held_path: Path, workers: int = 4) -> None:
    print(f"{pdf.name}: problem 1 (warms the cache)", file=sys.stderr)
    problems = [extract_problem(pdf, 1)]
    with ThreadPoolExecutor(max_workers=workers) as ex:
        problems += list(ex.map(lambda n: extract_problem(pdf, n), range(2, PROBLEMS_PER_EXAM + 1)))
    content, held, errs = [], [], []
    for p in problems:
        errs += check(p)
        c, h = to_content(p, year)
        if c:
            content.append(c)
        held += h
        if p.notes:
            print(f"  P{p.number} notes: {p.notes}", file=sys.stderr)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(content, indent=2, ensure_ascii=False) + "\n")
    held_path.parent.mkdir(parents=True, exist_ok=True)
    existing = json.loads(held_path.read_text()) if held_path.exists() else []
    existing = [h for h in existing if not h["id"].startswith(f"{year}-")] + held
    held_path.write_text(json.dumps(existing, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"file": out.name, "problems": len(content), "parts": sum(len(c["parts"]) for c in content), "held_parts": len(held), "errors": errs}))
