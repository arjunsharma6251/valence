"""`frq-figures`: recover Part II sub-parts that were held because they need a
figure. For each problem with held parts, the problem's own pages and the
solution pages go to the model as images; it returns the figure boxes on the
problem pages plus the held parts' key/rubric, and the crops are written to
public/figures and the parts inserted back into content/frq/<year>-national.json."""
from __future__ import annotations

import base64
import json
import re
import sys
from pathlib import Path

import pymupdf
from pydantic import BaseModel, Field

from .frq import DRAWING_NOTE, RubricLine, _system
from .llm import EXTRACT_MODEL, client
from .figures import Box, crop

ZOOM = 1.6


class Figure(BaseModel):
    page: int = Field(description="which problem page holds the artwork: 1 for the first problem page shown, 2 for the second")
    box: Box
    what: str = Field(description="what the artwork is, in a few words")


class RecoveredPart(BaseModel):
    label: str
    stem_md: str
    key_md: str
    rubric: list[RubricLine]
    max_points: int = Field(ge=1)
    drawing: bool
    figure_index: int | None = Field(description="index into figures of the artwork this part needs, or null if none")


class Recovered(BaseModel):
    title: str
    topic_id: str
    intro_md: str
    figures: list[Figure]
    shared_figure_index: int | None = Field(description="index of a figure that belongs to the whole problem (printed with the intro, before the first sub-part), else null")
    parts: list[RecoveredPart]
    notes: str


PROMPT_EXTRA = """
For this call you receive page images instead of the PDF: first the problem's own page(s), then the official solution pages. Do two things:
1. Locate every piece of artwork on the problem pages that a student needs for the listed sub-parts (graphs, spectra, unit-cell or structure drawings, plotted data, drawn tables). Give a tight bounding box per figure as fractions of that page's width and height (origin top-left), including axis labels, legends and captions, excluding prose.
2. Transcribe ONLY the listed sub-parts (stem, official solution as key_md, rubric, max_points) following the rules above, and point each at the figure it needs. Parts that ask the student to draw on a supplied graph or table should still be included; describe the expected drawing in key_md.
Also return the problem's title, topic_id and intro_md (used only if the problem is missing from the content file)."""


def _img(png: bytes) -> dict:
    return {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": base64.standard_b64encode(png).decode()}}


def _render(page: pymupdf.Page) -> bytes:
    return page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM)).tobytes("png")


def problem_pages(doc: pymupdf.Document, number: int) -> tuple[list[int], list[int]]:
    """(problem page indexes, solution page indexes), 0-based."""
    texts = [p.get_text() for p in doc]
    sol_start = next((i for i, t in enumerate(texts) if re.search(r"SOLUTIONS|Part 2 Solutions|Exam Answers|PART II\s*[–-]?\s*KEY|ANSWER KEY", t) and i > 1), len(texts))
    probs = [i for i, t in enumerate(texts[:sol_start]) if re.search(rf"Question\s+{number}\s+\(page", t)]
    if not probs:
        starts = {n: next((i for i, t in enumerate(texts[:sol_start]) if re.search(rf"(^|\n)\s*{n}\.\s*\[", t)), None) for n in range(1, 10)}
        s = starts.get(number)
        if s is not None:
            nxt = starts.get(number + 1)
            probs = [s] if nxt == s or nxt is None else list(range(s, nxt + 1))
    return probs, list(range(sol_start, len(texts)))


def recover(doc: pymupdf.Document, number: int, held: list[dict]) -> tuple[Recovered, list[int]]:
    probs, sols = problem_pages(doc, number)
    if not probs:
        raise RuntimeError(f"problem {number}: pages not found")
    content: list[dict] = []
    for i in probs:
        content += [{"type": "text", "text": f"Problem page {i + 1}:"}, _img(_render(doc[i]))]
    for i in sols:
        content += [{"type": "text", "text": f"Solution page {i + 1}:"}, _img(_render(doc[i]))]
    listing = "\n".join(f"- ({h['label']}) {h['stem_md'][:160]}" for h in held)
    content.append({"type": "text", "text": f"Problem {number}. Held sub-parts to transcribe:\n{listing}"})
    resp = client().messages.parse(model=EXTRACT_MODEL, max_tokens=8000, system=_system() + PROMPT_EXTRA, messages=[{"role": "user", "content": content}], output_format=Recovered)
    if resp.parsed_output is None:
        raise RuntimeError(f"problem {number}: no structured output")
    return resp.parsed_output, probs


def _label_key(label: str) -> tuple:
    m = re.match(r"([a-z]+)\s*\(?([ivx]*)\)?", label.lower())
    return (m.group(1), m.group(2)) if m else (label, "")


def run_frq_figures(year: int, pdf: Path, content: Path, held_path: Path, out_dir: Path) -> None:
    problems = json.loads(content.read_text())
    by_id = {p["id"]: p for p in problems}
    held = json.loads(held_path.read_text()) if held_path.exists() else []
    groups: dict[str, list[dict]] = {}
    for h in held:
        groups.setdefault(h["id"], []).append(h)
    doc = pymupdf.open(pdf)
    out_dir.mkdir(parents=True, exist_ok=True)
    recovered_parts = figures_written = 0
    still_held: list[dict] = []
    for pid, hs in sorted(groups.items()):
        number = int(pid.split("P")[-1])
        try:
            rec, probs = recover(doc, number, hs)
        except Exception as e:  # noqa: BLE001
            print(f"  {pid}: failed ({e})", file=sys.stderr)
            still_held += hs
            continue
        urls: list[str | None] = []
        for k, fig in enumerate(rec.figures):
            page_idx = probs[fig.page - 1] if 1 <= fig.page <= len(probs) else fig.page - 1
            if page_idx not in probs:
                urls.append(None)
                continue
            path = out_dir / f"{pid}-f{k + 1}.png"
            crop(doc[page_idx], fig.box, path)
            urls.append(f"/figures/{path.name}")
            figures_written += 1
        prob = by_id.get(pid)
        if prob is None:
            prob = {"id": pid, "year": year, "level": "national", "number": number, "title": rec.title, "topic_id": rec.topic_id, "intro_md": rec.intro_md, "parts": [],
                    "source": f"USNCO {year} National Part II exam, problem {number}. © American Chemical Society; reproduced for non-commercial practice."}
            problems.append(prob)
            by_id[pid] = prob
        if rec.shared_figure_index is not None and 0 <= rec.shared_figure_index < len(urls) and urls[rec.shared_figure_index]:
            prob["figure_url"] = urls[rec.shared_figure_index]
        wanted = {h["label"] for h in hs}
        for part in rec.parts:
            if part.label not in wanted or not part.stem_md.strip():
                continue
            rubric = [r.model_dump() for r in part.rubric if r.points > 0]
            if sum(r["points"] for r in rubric) != part.max_points:
                rubric = [{"points": part.max_points, "criterion": "Answer matches the official key: " + part.key_md[:160].replace("\n", " ")}]
            entry = {"label": part.label, "stem_md": part.stem_md + (DRAWING_NOTE if part.drawing else ""), "key_md": part.key_md, "rubric": rubric, "max_points": part.max_points}
            if part.figure_index is not None and 0 <= part.figure_index < len(urls) and urls[part.figure_index] and urls[part.figure_index] != prob.get("figure_url"):
                entry["figure_url"] = urls[part.figure_index]
            prob["parts"] = [x for x in prob["parts"] if x["label"] != part.label] + [entry]
            wanted.discard(part.label)
            recovered_parts += 1
        prob["parts"].sort(key=lambda x: _label_key(x["label"]))
        still_held += [h for h in hs if h["label"] in wanted]
        if rec.notes:
            print(f"  {pid} notes: {rec.notes}", file=sys.stderr)
    problems.sort(key=lambda p: p["number"])
    content.write_text(json.dumps(problems, indent=2, ensure_ascii=False) + "\n")
    held_path.write_text(json.dumps(still_held, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"year": year, "held_before": len(held), "recovered_parts": recovered_parts, "figures": figures_written, "still_held": len(still_held)}))
