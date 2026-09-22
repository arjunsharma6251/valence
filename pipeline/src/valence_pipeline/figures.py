"""`figures`: attach cropped figures to questions that need them.

Two sources of work for one exam:
  1. shipped questions whose text refers to a graph/structure/diagram
     ("shown below", "the following structure", ...) but have no figure_url;
  2. held questions (rows in the raw work CSV that never reached the content
     file because their answer options are drawings).
For each, the PDF page is rendered and Claude returns a bounding box for the
figure; the crop is written to public/figures/<id>.png and the content JSON
is updated in place (held questions are inserted with placeholder options)."""
from __future__ import annotations

import base64
import csv
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pymupdf
from pydantic import BaseModel, Field

from .llm import EXTRACT_MODEL, client
from .schema import Level, question_id

DPI = 200
PAD = 0.004  # fraction of page added around the model's box
FIGURE_WORDS = re.compile(
    r"\b(shown|below|figure|graph(ed)?|diagram|spectrum|spectra|plot(ted)?|drawn|pictured|depicted|image|curve|unit cell"
    r"|structures? (shown|below|above)|the following (structures?|graph|diagram|plot|table|data|figure|reaction profile))\b",
    re.I,
)


class Box(BaseModel):
    x0: float = Field(ge=0, le=1)
    y0: float = Field(ge=0, le=1)
    x1: float = Field(ge=0, le=1)
    y1: float = Field(ge=0, le=1)


class Located(BaseModel):
    has_figure: bool = Field(description="false if the question has no drawn figure on this page (a plain text table or equation is not a figure)")
    box: Box | None = Field(description="tight box around everything drawn for this question, as fractions of page width/height: graph with axis labels and legend, structure drawings, and all four answer options when the options themselves are drawings")
    options_are_drawings: bool
    note: str


SYSTEM = """You locate figures on scanned USNCO exam pages. Given a page image and one question, return the bounding box (fractions of page width and height, origin top-left) of the artwork that belongs to that question only: graphs, spectra, structure drawings, diagrams, images of tables, and answer options when the options are drawings rather than text. Make the box tight: it must include axis labels, legends and captions but stop at the artwork's edge, not at the surrounding text lines. Exclude the question's prose stem, other questions, headers and footers. Pages are two-column: keep the box inside the question's column unless the figure spans both. If the question has no artwork, set has_figure=false."""


def _render(page: pymupdf.Page, zoom: float) -> bytes:
    return page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom)).tobytes("png")


def locate(page_png: bytes, number: int, stem: str, page_no: int) -> Located:
    resp = client().messages.parse(
        model=EXTRACT_MODEL,
        max_tokens=600,
        system=SYSTEM,
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": base64.standard_b64encode(page_png).decode()}},
            {"type": "text", "text": f"Page {page_no}. Question {number} begins: \"{stem[:240]}\". Return the box for question {number}'s figure."},
        ]}],
        output_format=Located,
    )
    if resp.parsed_output is None:
        raise RuntimeError(f"question {number}: no structured output")
    return resp.parsed_output


def _frac_inside(r: pymupdf.Rect, clip: pymupdf.Rect) -> float:
    inter = pymupdf.Rect(r) & clip
    return 0.0 if inter.is_empty or r.get_area() == 0 else inter.get_area() / r.get_area()


def _words(t: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]{2,}", t.lower()))


def _snap_clip(page: pymupdf.Page, clip: pymupdf.Rect, prose: str = "") -> pymupdf.Rect:
    """Tighten the model's box to the PDF objects that are actually inside it:
    vector drawings and images mostly inside the box, plus text lines fully
    inside it (axis labels, atom labels, option letters). A stem or option
    line that only partly overlaps the box is left out, which is exactly the
    bleed we want to drop."""
    parts: list[pymupdf.Rect] = []
    for d in page.get_drawings():
        r = d.get("rect")
        if r and not r.is_empty and r.width < page.rect.width * 0.9 and _frac_inside(r, clip) >= 0.5:
            parts.append(pymupdf.Rect(r))
    for info in page.get_images(full=True):
        for r in page.get_image_rects(info[0]):
            if _frac_inside(r, clip) >= 0.5:
                parts.append(pymupdf.Rect(r))
    prose_words = _words(prose)
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            r = pymupdf.Rect(line["bbox"])
            if _frac_inside(r, clip) < 0.85:
                continue
            w = _words("".join(sp["text"] for sp in line.get("spans", [])))
            if len(w) >= 2 and len(w & prose_words) / len(w) >= 0.6:
                continue  # a line of the question's own stem/options, not artwork
            parts.append(r)
    if not parts:
        return clip
    u = parts[0]
    for r in parts[1:]:
        u |= r
    return (u + (-4, -4, 4, 4)) & (clip + (-6, -6, 6, 6))


def crop(page: pymupdf.Page, box: Box, out: Path, prose: str = "") -> None:
    r = page.rect
    clip = pymupdf.Rect(
        r.width * max(0.0, box.x0 - PAD), r.height * max(0.0, box.y0 - PAD),
        r.width * min(1.0, box.x1 + PAD), r.height * min(1.0, box.y1 + PAD),
    )
    zoom = DPI / 72
    clip = _snap_clip(page, clip, prose)
    page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=clip).save(out)


def _held_question(row: dict, answer: dict, year: int, level: Level, qid: str) -> dict:
    pct = answer.get("percent_correct", "").strip()
    est = 0.5
    if pct:
        v = float(pct)
        est = v / 100 if v > 1 else v
        est = min(0.99, max(0.01, est))
    return {
        "id": qid, "year": year, "level": level, "number": int(row["number"]),
        "stem_md": row["stem_md"].strip(), "figure_url": None,
        "topic_id": row["topic_id"], "subtopic": row.get("subtopic", ""),
        "est_percent_correct": est,
        "field_percent_correct": est if pct else None,
        "correct_option": answer["correct_option"],
        "options": [{"label": L, "text_md": f"Shown in the figure ({L})"} for L in "ABCD"],
        "acs_solution_md": answer.get("acs_solution_md") or None,
        "source": f"USNCO {year} {'Local' if level == 'local' else 'National Part I'} exam, question {int(row['number'])}. © American Chemical Society; reproduced for non-commercial practice.",
        "verified_answer": True,
    }


def run_figures(content: Path, pdf: Path, work: Path, year: int, level: Level, out_dir: Path, id_suffix: str = "", workers: int = 4, dry_run: bool = False, redo: bool = False) -> None:
    questions = json.loads(content.read_text())
    by_id = {q["id"]: q for q in questions}
    raw = {int(r["number"]): r for r in csv.DictReader(open(work / "questions.csv"))}
    answers = {int(r["number"]): r for r in csv.DictReader(open(work / "answers.csv"))}
    doc = pymupdf.open(pdf)

    todo: list[tuple[dict, dict, bool]] = []  # (question, raw row, held)
    for n, row in sorted(raw.items()):
        qid = question_id(year, level, n) + id_suffix
        q = by_id.get(qid)
        if q is None:
            if n in answers and answers[n].get("correct_option"):
                todo.append((_held_question(row, answers[n], year, level, qid), row, True))
            continue
        if q.get("figure_url") and not redo:
            continue
        text = q["stem_md"] + " " + " ".join(o["text_md"] for o in q["options"])
        if FIGURE_WORDS.search(text):
            todo.append((q, row, False))
    print(f"{content.name}: {len(todo)} candidates ({sum(1 for t in todo if t[2])} held)", file=sys.stderr)
    if dry_run:
        for q, row, held in todo:
            print(f"  {q['id']} p{row['page']} {'HELD ' if held else ''}{q['stem_md'][:90]!r}", file=sys.stderr)
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    zoom = 1.6  # ~115 dpi page image for locating; crops are re-rendered at DPI
    page_png: dict[int, bytes] = {}
    for _, row, _ in todo:
        p = int(row["page"])
        page_png.setdefault(p, _render(doc[p - 1], zoom))

    def work_one(item):
        q, row, held = item
        p = int(row["page"])
        try:
            loc = locate(page_png[p], q["number"], q["stem_md"], p)
        except Exception as e:  # noqa: BLE001
            return q, held, None, f"error: {e}"
        if not loc.has_figure or loc.box is None:
            return q, held, None, loc.note
        path = out_dir / f"{q['id']}.png"
        prose = q["stem_md"] + " " + " ".join(o["text_md"] for o in q["options"] if not o["text_md"].startswith("Shown in the figure"))
        crop(doc[p - 1], loc.box, path, prose)
        return q, held, path, loc.note

    attached = added = skipped = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for q, held, path, note in ex.map(work_one, todo):
            if path is None:
                skipped += 1
                print(f"  {q['id']}: no figure ({note})", file=sys.stderr)
                continue
            q["figure_url"] = f"/figures/{path.name}"
            if held:
                questions.append(q)
                added += 1
            else:
                attached += 1
    questions.sort(key=lambda x: x["number"])
    content.write_text(json.dumps(questions, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"file": content.name, "candidates": len(todo), "attached": attached, "held_added": added, "no_figure": skipped}))
