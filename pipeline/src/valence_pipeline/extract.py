"""`extract`: exam PDF -> page PNGs -> Claude vision -> questions.csv + answers.csv + figures/."""

from __future__ import annotations

import base64
import json
import sys
from pathlib import Path
from typing import Literal

import pymupdf
from pydantic import BaseModel, Field

from .csvio import AnswerRow, QuestionRow, write_answers, write_questions
from .llm import EXTRACT_MODEL, client
from .schema import Level, load_topics, question_id

DPI = 150


class FigureBox(BaseModel):
    """Approximate location of a figure on the page, as fractions of page size."""

    x0: float = Field(ge=0, le=1)
    y0: float = Field(ge=0, le=1)
    x1: float = Field(ge=0, le=1)
    y1: float = Field(ge=0, le=1)


class ExtractedQuestion(BaseModel):
    number: int
    stem_md: str
    options: list[str] = Field(description="Exactly four option texts, in order A, B, C, D")
    needs_figure: bool
    figure_box: FigureBox | None
    topic_id: str
    subtopic: str
    confidence: Literal["high", "medium", "low"]


class PageExtraction(BaseModel):
    questions: list[ExtractedQuestion]
    notes: str = Field(description="Anything the reviewer should know about this page")


def render_pages(pdf: Path, out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf)
    paths = []
    zoom = DPI / 72
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
        p = out_dir / f"page-{i:02d}.png"
        pix.save(p)
        paths.append(p)
    return paths


def _system_prompt() -> str:
    topics = load_topics()
    topic_lines = "\n".join(
        f"- {t.id}: {t.name} (subtopics: {', '.join(t.subtopics)})" for t in topics
    )
    return f"""You transcribe USNCO multiple-choice exam pages into structured data.

For every complete question visible on the page, return its number, stem, and exactly four options (A–D) in order.
Write chemistry in mini-markdown: inline math in $...$ using KaTeX with mhchem, e.g. $\\ce{{2H2 + O2 -> 2H2O}}$, $K_\\text{{sp}} = 1.6 \\times 10^{{-10}}$, $\\Delta H^\\circ$. Use **bold** sparingly. Do not use HTML.
If the question depends on a figure, structure drawing, graph, or table that cannot be expressed as text, set needs_figure=true and give a bounding box (fractions of page width/height) that tightly contains that figure. Small data tables should be transcribed as plain text lines in the stem instead.
Skip questions that continue from a previous page or are cut off; mention them in notes.
Classify each question into one of these topic ids and pick the closest subtopic:
{topic_lines}

USNCO Part I exams (local and national) run 60 questions in ten blocks of about six, one block per topic, in this official order: stoichiometry (1-6, stoichiometry and solutions), descriptive (7-12, descriptive and laboratory chemistry), states-of-matter (13-18), thermodynamics (19-24), kinetics (25-30), equilibrium (31-36), redox (37-42), atomic-structure (43-48), bonding (49-54), organic (55-60). Treat the question number as a strong prior for topic_id, but classify by the chemistry actually asked; blocks are sometimes merged or shifted by a question or two.
"""


def extract_page(png: Path, page_no: int) -> PageExtraction:
    data = base64.standard_b64encode(png.read_bytes()).decode()
    resp = client().messages.parse(
        model=EXTRACT_MODEL,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=_system_prompt(),
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": data}},
                    {"type": "text", "text": f"This is page {page_no}. Extract every complete question."},
                ],
            }
        ],
        output_format=PageExtraction,
    )
    if resp.stop_reason == "refusal":
        raise RuntimeError(f"page {page_no}: model refused ({resp.stop_details})")
    if resp.parsed_output is None:
        raise RuntimeError(f"page {page_no}: could not parse structured output")
    return resp.parsed_output


def crop_figure(png: Path, box: FigureBox, dest: Path) -> None:
    pix = pymupdf.Pixmap(str(png))
    w, h = pix.width, pix.height
    rect = pymupdf.IRect(int(box.x0 * w), int(box.y0 * h), int(box.x1 * w), int(box.y1 * h))
    if rect.is_empty:
        return
    clip = pymupdf.Pixmap(pix, rect)
    dest.parent.mkdir(parents=True, exist_ok=True)
    clip.save(dest)


def run_extract(pdf: Path, year: int, level: Level, out: Path) -> None:
    pages = render_pages(pdf, out / "pages")
    figures_dir = out / "figures"
    rows: list[QuestionRow] = []
    raw_dump = []
    for i, png in enumerate(pages, start=1):
        print(f"[extract] page {i}/{len(pages)}", file=sys.stderr)
        page = extract_page(png, i)
        raw_dump.append({"page": i, **page.model_dump()})
        for q in page.questions:
            opts = (q.options + ["", "", "", ""])[:4]
            figure_url = ""
            if q.needs_figure and q.figure_box is not None:
                fname = f"{question_id(year, level, q.number)}.png"
                crop_figure(png, q.figure_box, figures_dir / fname)
                figure_url = f"/figures/{fname}"
            notes = []
            if q.confidence != "high":
                notes.append(f"confidence={q.confidence}")
            if q.needs_figure and q.figure_box is None:
                notes.append("needs figure but no box returned")
            if len(q.options) != 4:
                notes.append(f"{len(q.options)} options extracted")
            rows.append(
                QuestionRow(
                    number=q.number,
                    page=i,
                    stem_md=q.stem_md,
                    option_a=opts[0],
                    option_b=opts[1],
                    option_c=opts[2],
                    option_d=opts[3],
                    figure_url=figure_url,
                    topic_id=q.topic_id,
                    subtopic=q.subtopic,
                    notes="; ".join(notes),
                )
            )
        if page.notes.strip():
            print(f"[extract] page {i} notes: {page.notes}", file=sys.stderr)

    (out / "raw.json").write_text(json.dumps(raw_dump, indent=2))
    (out / "meta.json").write_text(json.dumps({"year": year, "level": level, "pdf": str(pdf)}, indent=2))
    write_questions(out / "questions.csv", rows)
    write_answers(out / "answers.csv", [AnswerRow(number=r.number) for r in rows])
    print(f"[extract] wrote {len(rows)} questions to {out / 'questions.csv'}", file=sys.stderr)
    print(f"[extract] fill in {out / 'answers.csv'} from the official key, then run `review`", file=sys.stderr)
