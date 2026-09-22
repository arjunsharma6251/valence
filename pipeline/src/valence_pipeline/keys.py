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
    pages = [doc[i].get_text() for i in range(doc.page_count)]
    key_pages = [t for t in pages[-3:] if re.search(r"\bKEY\b", t)]
    if not key_pages:
        return []
    tokens = "\n".join(key_pages).split()

    # Interleaved layout ("1. B 87%" or "1. B"): each number is followed by its
    # letter before the next number. Columnar layout (all numbers, then all
    # letters, then all percents) is used when interleaving fails.
    inter: list[KeyRow] = []
    cur: int | None = None
    cur_ans: str | None = None
    cur_pct: float | None = None
    for t in tokens:
        if re.fullmatch(r"\d{1,2}\.?", t) and 1 <= int(t.rstrip(".")) <= 60:
            if cur is not None:
                inter.append(KeyRow(cur, cur_ans or "", cur_pct))
            cur, cur_ans, cur_pct = int(t.rstrip(".")), None, None
        elif cur is not None and cur_ans is None and re.fullmatch(r"[A-D]", t):
            cur_ans = t
        elif cur is not None and re.fullmatch(r"\d{1,3}%", t):
            cur_pct = float(t[:-1]) / 100
    if cur is not None:
        inter.append(KeyRow(cur, cur_ans or "", cur_pct))
    by_num = {r.number: r for r in inter if 1 <= r.number <= 60}
    if len(by_num) >= 55 and sum(1 for r in by_num.values() if r.answer) >= 50:
        rows = [by_num[k] for k in sorted(by_num)]
        # Some years print "% Correct" as its own column after all the answers.
        # Then the interleaved pass attached nothing (or everything to #60):
        # read the percent column in order, honouring a "removed" placeholder
        # for an invalidated question, and only trust it when the count matches.
        if sum(1 for r in rows if r.percent_correct is not None) < len(rows) // 2:
            text = "\n".join(key_pages)
            m0 = re.search(r"%\s*Correct", text)
            i = m0.start() if m0 else -1
            if i >= 0:
                col: list[float | None] = []
                for m in re.finditer(r"(\d{1,3})\s*%|\bremoved\b", text[i:]):
                    col.append(None if m.group(0).endswith("removed") else float(m.group(1)) / 100)
                if len(col) == 60:
                    rows = [KeyRow(r.number, r.answer, col[r.number - 1]) for r in rows]
                else:
                    rows = [KeyRow(r.number, r.answer, None) for r in rows]
        return rows

    numbers = [int(t.rstrip(".")) for t in tokens if re.fullmatch(r"\d{1,2}\.?", t) and 1 <= int(t.rstrip(".")) <= 60]
    answers = [t for t in tokens if re.fullmatch(r"[A-D]", t)]
    pcts = [float(t[:-1]) / 100 for t in tokens if re.fullmatch(r"\d{1,3}%", t)]
    rows: list[KeyRow] = []
    if len(numbers) >= 60 and len(answers) >= 60:
        nums, ans = numbers[:60], answers[:60]
        pc = pcts[:60] if len(pcts) >= 60 else [None] * 60
        for i in sorted(range(60), key=lambda i: nums[i]):
            rows.append(KeyRow(nums[i], ans[i], pc[i]))
    return rows


def key_csv(pdf: Path) -> str:
    rows = parse_key(pdf)
    out = ["number,correct_option,percent_correct"]
    for r in rows:
        out.append(f"{r.number},{r.answer},{'' if r.percent_correct is None else r.percent_correct}")
    return "\n".join(out) + "\n"
