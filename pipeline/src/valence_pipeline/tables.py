"""`tables`: re-format data tables that the PDF text layer flattened into a
single run-on line ("Substance ∆H°f ... PCl3(g) –288.7 311.6 Cl2(g) 0 223.1").
The renderer has no table support, so each row becomes its own line. Values and
wording are preserved exactly; only layout changes."""
from __future__ import annotations

import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from pydantic import BaseModel

from .llm import DRAFT_MODEL, client

HEADER = re.compile(
    r"\b(Substance|Compound|Bond|Element|Species|Trial|Experiment|Sample|Solution|Metal|Ion|Isotope|Acid|Gas|Reaction)\b\s"
)
NUMBER = re.compile(r"(?<![\w.^{])-?[–−]?\d+\.?\d*(?![\w.}])")


def looks_flattened(stem: str) -> bool:
    return "\n" not in stem and bool(HEADER.search(stem)) and len(NUMBER.findall(stem)) >= 5


SYSTEM = """You re-format one USNCO exam question whose data table was flattened into a single line by PDF text extraction.

Rules:
- Keep every word, number, unit and piece of chemistry exactly as given. Do not solve, round, reorder or add anything.
- Put the question's prose first, unchanged, as its own paragraph.
- Then put the table, one row per line, as "- Label: column name value; column name value". Take the column names from the flattened header.
- Keep existing KaTeX/mhchem markup ($...$, \\ce{...}) exactly as it appears. Do not add or remove math delimiters.
- Separate paragraphs with a blank line. No markdown tables, no HTML."""


class Reformatted(BaseModel):
    id: str
    stem_md: str


class Batch(BaseModel):
    questions: list[Reformatted]


def _numbers(s: str) -> list[str]:
    return sorted(n.replace("−", "-").replace("–", "-") for n in NUMBER.findall(s))


def _chunk(chunk: list[dict]) -> list[Reformatted]:
    payload = [{"id": q["id"], "stem_md": q["stem_md"]} for q in chunk]
    resp = client().messages.parse(
        model=DRAFT_MODEL,
        max_tokens=8000,
        system=SYSTEM,
        messages=[{"role": "user", "content": "Re-format these stems. Return every id.\n\n" + json.dumps(payload, ensure_ascii=False)}],
        output_format=Batch,
    )
    if resp.parsed_output is None:
        raise RuntimeError("no structured output")
    return resp.parsed_output.questions


def _safe(chunk: list[dict]) -> list[Reformatted] | None:
    try:
        return _chunk(chunk)
    except Exception as e:  # noqa: BLE001
        print(f"chunk failed: {e}", file=sys.stderr)
        return None


def run_tables(paths: list[Path], chunk_size: int = 4, workers: int = 3) -> None:
    for path in paths:
        questions = json.loads(path.read_text())
        todo = [q for q in questions if looks_flattened(q["stem_md"])]
        if not todo:
            continue
        chunks = [todo[i : i + chunk_size] for i in range(0, len(todo), chunk_size)]
        out: dict[str, Reformatted] = {}
        with ThreadPoolExecutor(max_workers=workers) as ex:
            for res in ex.map(_safe, chunks):
                for r in res or []:
                    out[r.id] = r
        changed, rejected = 0, []
        for q in questions:
            r = out.get(q["id"])
            if not r or r.stem_md == q["stem_md"]:
                continue
            # Refuse a rewrite that lost or invented a number: layout only.
            if _numbers(r.stem_md) != _numbers(q["stem_md"]):
                rejected.append(q["id"])
                continue
            q["stem_md"] = r.stem_md
            changed += 1
        path.write_text(json.dumps(questions, indent=2, ensure_ascii=False) + "\n")
        print(json.dumps({"file": path.name, "flattened": len(todo), "reformatted": changed, "rejected": rejected}))
