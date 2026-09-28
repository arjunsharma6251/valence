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
    out = (u + (-4, -4, 4, 4)) & (clip + (-6, -6, 6, 6))
    # Don't let the top padding pick up the descenders of the stem line above.
    above = [
        pymupdf.Rect(line["bbox"]).y1
        for block in page.get_text("dict")["blocks"]
        for line in block.get("lines", [])
        if pymupdf.Rect(line["bbox"]).y1 <= u.y0 + 2 and pymupdf.Rect(line["bbox"]).y1 > out.y0
    ]
    if above:
        out.y0 = min(max(above) + 1, u.y0)
    return out


def _clip_for(page: pymupdf.Page, box: Box) -> pymupdf.Rect:
    r = page.rect
    return pymupdf.Rect(
        r.width * max(0.0, box.x0 - PAD), r.height * max(0.0, box.y0 - PAD),
        r.width * min(1.0, box.x1 + PAD), r.height * min(1.0, box.y1 + PAD),
    )


def _question_rects(page: pymupdf.Page) -> dict[int, pymupdf.Rect]:
    """Where each question number starts on the page, from the text layer."""
    out: dict[int, pymupdf.Rect] = {}
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            text = "".join(sp["text"] for sp in line.get("spans", []))
            m = re.match(r"\s*(\d{1,2})\.\s", text)
            if m:
                n = int(m.group(1))
                r = pymupdf.Rect(line["bbox"])
                if n not in out or r.y0 < out[n].y0:
                    out[n] = r
    return out


def clamp_to_question(page: pymupdf.Page, clip: pymupdf.Rect, number: int) -> pymupdf.Rect:
    """Keep the crop inside this question: below its own number, above the next
    one, and within its column. Exams are two-column, and the model sometimes
    slides the box down into the following question."""
    rects = _question_rects(page)
    here = rects.get(number)
    if here is None:
        return clip
    out = pymupdf.Rect(clip)
    out.y0 = max(out.y0, here.y0 - 2)
    mid = page.rect.width / 2
    right_column = here.x0 >= mid
    below = [r for n, r in rects.items() if n > number and r.y0 > here.y0 and (r.x0 >= mid) == right_column]
    if below:
        out.y1 = min(out.y1, min(r.y0 for r in below) - 2)
    if right_column:
        out.x0 = max(out.x0, mid - 8)
    else:
        out.x1 = min(out.x1, mid + 8)
    return out if out.y1 - out.y0 > 20 and out.x1 - out.x0 > 20 else clip


def spills_into_neighbour(page: pymupdf.Page, box: Box, number: int) -> bool:
    """True when the box swallows a different numbered question, which means the
    model drifted off this question's artwork."""
    text = page.get_textbox(_clip_for(page, box))
    return any(re.search(rf"(^|\n)\s*{n}\.\s", text) for n in (number - 1, number + 1, number + 2))


def crop(page: pymupdf.Page, box: Box, out: Path, prose: str = "", number: int | None = None) -> None:
    clip = clamp_to_question(page, _clip_for(page, box), number) if number else _clip_for(page, box)
    zoom = DPI / 72
    clip = _snap_clip(page, clip, prose)
    page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=clip).save(out)


def resolve_page(doc: pymupdf.Document, number: int, stem: str, recorded: int) -> int:
    """The page column in questions.csv is sometimes off (answer-key pages, or a
    question that starts on the previous column). Trust it only when that page
    really holds the question: look for "<n>." plus a distinctive word from the
    stem, and otherwise scan the document for the best match."""
    words = [w for w in re.findall(r"[A-Za-z]{6,}", re.sub(r"\$[^$]*\$", " ", stem))][:6]
    marker = re.compile(rf"(^|\n)\s*{number}\.\s")

    def score(i: int) -> int:
        if i < 0 or i >= doc.page_count:
            return -1
        t = doc[i].get_text()
        return (2 if marker.search(t) else 0) + sum(1 for w in words if w in t)

    best, best_score = recorded - 1, score(recorded - 1)
    if best_score >= 2 + min(2, len(words)):
        return best
    for i in range(doc.page_count):
        sc = score(i)
        if sc > best_score:
            best, best_score = i, sc
    return best


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


def run_figures(content: Path, pdf: Path, work: Path, year: int, level: Level, out_dir: Path, id_suffix: str = "", workers: int = 4, dry_run: bool = False, redo: bool = False, only: set[int] | None = None) -> None:
    questions = json.loads(content.read_text())
    by_id = {q["id"]: q for q in questions}
    raw = {int(r["number"]): r for r in csv.DictReader(open(work / "questions.csv"))}
    answers = {int(r["number"]): r for r in csv.DictReader(open(work / "answers.csv"))}
    doc = pymupdf.open(pdf)

    todo: list[tuple[dict, dict, bool]] = []  # (question, raw row, held)
    for n, row in sorted(raw.items()):
        if only is not None and n not in only:
            continue
        qid = question_id(year, level, n) + id_suffix
        q = by_id.get(qid)
        if q is None:
            if n in answers and answers[n].get("correct_option"):
                todo.append((_held_question(row, answers[n], year, level, qid), row, True))
            continue
        if q.get("figure_url") and not redo:
            continue
        text = q["stem_md"] + " " + " ".join(o["text_md"] for o in q["options"])
        if only is not None or FIGURE_WORDS.search(text):
            todo.append((q, row, False))
    print(f"{content.name}: {len(todo)} candidates ({sum(1 for t in todo if t[2])} held)", file=sys.stderr)
    if dry_run:
        for q, row, held in todo:
            print(f"  {q['id']} p{row['page']} {'HELD ' if held else ''}{q['stem_md'][:90]!r}", file=sys.stderr)
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    zoom = 1.6  # ~115 dpi page image for locating; crops are re-rendered at DPI
    page_png: dict[int, bytes] = {}

    def page_image(p: int) -> bytes:
        if p not in page_png:
            page_png[p] = _render(doc[p - 1], zoom)
        return page_png[p]

    def work_one(item):
        q, row, held = item
        p = resolve_page(doc, q["number"], q["stem_md"], int(row["page"])) + 1
        if p != int(row["page"]):
            print(f"  {q['id']}: page {row['page']} -> {p}", file=sys.stderr)
        loc = None
        for attempt in range(2):
            try:
                loc = locate(page_image(p), q["number"], q["stem_md"], p)
            except Exception as e:  # noqa: BLE001
                return q, held, None, f"error: {e}"
            if not loc.has_figure or loc.box is None:
                return q, held, None, loc.note
            if not spills_into_neighbour(doc[p - 1], loc.box, q["number"]):
                break
            print(f"  {q['id']}: box spilled into a neighbouring question, retrying", file=sys.stderr)
        else:
            return q, held, None, "box kept spilling into a neighbouring question"
        path = out_dir / f"{q['id']}.png"
        prose = q["stem_md"] + " " + " ".join(o["text_md"] for o in q["options"] if not o["text_md"].startswith("Shown in the figure"))
        crop(doc[p - 1], loc.box, path, prose, q["number"])
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
