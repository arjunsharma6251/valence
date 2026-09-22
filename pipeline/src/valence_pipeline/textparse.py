"""Deterministic, no-AI extraction of USNCO multiple-choice exams from their
text layer. Produces the same work-dir layout as `extract` (questions.csv,
answers.csv, raw.txt) so `review`/`import` work unchanged. Formatting that
the PDF text layer loses (subscripts, exponents, arrows) is left for the
optional `polish` pass; the stem text is otherwise faithful."""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import pymupdf

from .csvio import AnswerRow, QuestionRow, write_answers, write_questions
from .keys import parse_key

# Official ten blocks of six, in exam order.
BLOCKS = ["stoichiometry", "descriptive", "states-of-matter", "thermodynamics", "kinetics", "equilibrium", "redox", "atomic-structure", "bonding", "organic"]

FIGURE_HINT = re.compile(r"\b(figure|graph|diagram|shown below|structure[s]? below|plot|sketch|drawn|following (?:table|data|diagram|structures?))\b", re.I)


def block_topic(n: int) -> str:
    return BLOCKS[min(9, max(0, (n - 1) // 6))]


@dataclass
class Parsed:
    number: int
    page: int
    stem: str
    options: list[str]
    figure: bool
    notes: str


def _clean(s: str) -> str:
    s = s.replace("–", "–").replace("", "×").replace("", "→").replace("", "→").replace("®", "→")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\s*\n\s*", " ", s).strip()
    # "1.35  1024" / "1.35 × 1024" → "1.35 × 10^24" (the × glyph is a private-use char in these PDFs)
    s = re.sub(r"(\d)\s*×?\s*10(-?\d{1,2})\b", r"\1 × 10^\2", s)
    return s


def parse_exam(pdf: Path) -> tuple[list[Parsed], str]:
    doc = pymupdf.open(pdf)
    chunks = []
    for i in range(doc.page_count):
        t = doc[i].get_text()
        if re.search(r"\bKEY\b", t) and i >= doc.page_count - 3:
            break  # answer key pages
        t = re.sub(r"^\s*(Page \d+|Property of ACS USNCO.*|Page \d+ of \d+)\s*$", "", t, flags=re.M)
        chunks.append((i + 1, t, len(doc[i].get_images()) > 0))
    text = "\n".join(f"\x1e{pno}\x1e{'I' if img else '-'}\n{t}" for pno, t, img in chunks)
    start = re.search(r"^\s*1\.\s", text, re.M)
    if not start:
        return [], text
    body = text[start.start():]

    # Split at every "N." line start; a chunk is a real question when it has
    # (A) and (B), its number is unseen and ≤ 60. Text order is not always
    # numeric order in two-column PDFs, so questions are placed by number.
    parts = re.split(r"(?m)^\s*(\d{1,2})\.\s", body)
    found: dict[int, Parsed] = {}
    order: list[int] = []
    page = 0
    has_img = False
    i = 1
    while i < len(parts) - 1:
        n = int(parts[i])
        chunk = parts[i + 1]
        i += 2
        for m in re.finditer(r"\x1e(\d+)\x1e([I-])", chunk):
            page = int(m.group(1))
            has_img = m.group(2) == "I"
        chunk = re.sub(r"\x1e\d+\x1e[I-]\n?", "", chunk)
        real = 1 <= n <= 60 and n not in found and "(A)" in chunk and "(B)" in chunk
        if not real:
            if order:
                found[order[-1]].stem += f" {n}. {_clean(chunk)}"
            continue
        m = re.search(r"\(A\)", chunk)
        stem_raw, opts_raw = chunk[: m.start()], chunk[m.start():]
        opts = [_clean(o) for o in re.split(r"\((?:A|B|C|D)\)\s*", opts_raw)[1:]][:4]
        stem = _clean(stem_raw)
        figure = bool(FIGURE_HINT.search(stem)) or any(not o for o in opts)
        notes = "" if len(opts) == 4 else f"{len(opts)} options parsed"
        if has_img:
            notes = (notes + " page has images").strip()
        found[n] = Parsed(n, page, stem, opts + [""] * (4 - len(opts)), figure, notes)
        order.append(n)
    out = [found[k] for k in sorted(found)]
    return out, body


def text_extract(pdf: Path, year: int, level: str, out: Path) -> dict:
    parsed, raw = parse_exam(pdf)
    keys = {r.number: r for r in parse_key(pdf)}
    out.mkdir(parents=True, exist_ok=True)
    (out / "raw.txt").write_text(raw)
    qrows = [
        QuestionRow(number=p.number, page=p.page, stem_md=p.stem, option_a=p.options[0], option_b=p.options[1], option_c=p.options[2], option_d=p.options[3],
                    figure_url="", topic_id=block_topic(p.number), subtopic="", notes=("figure? " if p.figure else "") + p.notes)
        for p in parsed
    ]
    arows = [
        AnswerRow(number=p.number, correct_option=keys[p.number].answer if p.number in keys else "", acs_solution_md="",
                  percent_correct="" if p.number not in keys or keys[p.number].percent_correct is None else str(keys[p.number].percent_correct))
        for p in parsed
    ]
    write_questions(out / "questions.csv", qrows)
    write_answers(out / "answers.csv", arows)
    (out / "meta.json").write_text(f'{{"year": {year}, "level": "{level}", "source_pdf": "{pdf.name}", "method": "text"}}\n')
    return {"questions": len(parsed), "with_4_options": sum(1 for p in parsed if all(p.options)), "figures": sum(1 for p in parsed if p.figure), "keys": sum(1 for k in keys.values() if k.answer)}
