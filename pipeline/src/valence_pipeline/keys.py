"""Parse the KEY page(s) printed at the end of USNCO local and national Part I
PDFs into (number, answer, percent_correct) rows. Pure text parsing with
PyMuPDF; nothing leaves the machine."""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import pymupdf


@dataclass
class KeyRow:
    number: int
    answer: str
    percent_correct: float | None


def parse_key(pdf: Path) -> list[KeyRow]:
    doc = pymupdf.open(pdf)
    # The key is on the last page or two; find the page that says KEY.
    pages = [doc[i].get_text() for i in range(doc.page_count)]
    key_pages = [t for t in pages[-3:] if re.search(r"\bKEY\b", t)]
    if not key_pages:
        return []
    text = "\n".join(key_pages)
    tokens = [t.strip() for t in text.split("\n") if t.strip()]
    numbers = [int(t.rstrip(".")) for t in tokens if re.fullmatch(r"\d{1,2}\.?", t)]
    answers = [t for t in tokens if re.fullmatch(r"[A-D]", t)]
    pcts = [float(t.rstrip("%")) / 100 for t in tokens if re.fullmatch(r"\d{1,3}%", t)]
    # Two layouts: "n. A" interleaved (local) or three parallel columns per half (national).
    rows: list[KeyRow] = []
    if len(numbers) >= 60 and len(answers) >= 60:
        nums = numbers[:60]
        ans = answers[:60]
        pc = pcts[:60] if len(pcts) >= 60 else [None] * 60
        # If the numbers are not sequential the layout was columnar; sort by number.
        order = sorted(range(60), key=lambda i: nums[i])
        for i in order:
            rows.append(KeyRow(nums[i], ans[i], pc[i]))
    return rows


def key_csv(pdf: Path) -> str:
    rows = parse_key(pdf)
    out = ["number,correct_option,percent_correct"]
    for r in rows:
        out.append(f"{r.number},{r.answer},{'' if r.percent_correct is None else r.percent_correct}")
    return "\n".join(out) + "\n"
