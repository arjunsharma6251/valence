"""`polish`: rewrite plain-text stems/options from the PDF text layer into
mini-markdown (KaTeX + mhchem) so subscripts, superscripts, exponents and
arrows render like the printed exam. Wording is preserved exactly; only
notation changes. Runs the Messages API with structured output, a few
questions per request, and writes the JSON back in place."""
from __future__ import annotations

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from pydantic import BaseModel

from .llm import DRAFT_MODEL, client

SYSTEM = """You convert chemistry exam questions from a flattened PDF text layer into mini-markdown.

Rules:
- Preserve every word, number and unit exactly. Do not paraphrase, fix, shorten or reorder anything. Do not change the answer options' meaning.
- Chemistry goes in KaTeX with mhchem: $\\ce{N2O5}$, $\\ce{Ca^2+}$, $\\ce{SO4^2-}$, $\\ce{2 H2(g) + O2(g) -> 2 H2O(l)}$, $\\ce{<=>}$ for equilibrium arrows. Formulas that the text layer flattened ("N2O5", "Ca2+", "SO42-", "Cu2CO3(OH)2", "K3Fe(C2O4)3 • 3H2O") must come back with the correct subscripts and charges.
- Exponents and units: "1.35 × 1024" or "1.35 × 10^24" → $1.35 \\times 10^{24}$; "mol-1" → mol$^{-1}$; "kJ mol-1 K-1" → kJ mol$^{-1}$ K$^{-1}$; "∆H°rxn" → $\\Delta H^\\circ_\\text{rxn}$; "Ksp" → $K_\\text{sp}$; "pKa" → p$K_\\text{a}$; "[H+]" → $[\\ce{H+}]$.
- Variables in math: $K$, $\\Delta G$, $E^\\circ$, $t_{1/2}$, $[A]_0$. Plain words, states like (aq)/(g) inside \\ce, and ordinary prose stay plain.
- Roman-numeral statements ("I.", "II.") stay plain text on their own lines separated by a blank line.
- If a stem or option is already correct mini-markdown, return it unchanged.
- Escape nothing else; no HTML."""


class PolishedQuestion(BaseModel):
    id: str
    stem_md: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str


class PolishedBatch(BaseModel):
    questions: list[PolishedQuestion]


def _polish_chunk(chunk: list[dict]) -> list[PolishedQuestion]:
    payload = [
        {"id": q["id"], "stem_md": q["stem_md"], **{f"option_{o['label'].lower()}": o["text_md"] for o in q["options"]}}
        for q in chunk
    ]
    resp = client().messages.parse(
        model=DRAFT_MODEL,
        max_tokens=16000,
        system=SYSTEM,
        messages=[{"role": "user", "content": "Convert these questions. Return every id you were given.\n\n" + json.dumps(payload, ensure_ascii=False)}],
        output_format=PolishedBatch,
    )
    if resp.parsed_output is None:
        raise RuntimeError("no structured output")
    return resp.parsed_output.questions


def polish_file(path: Path, chunk_size: int = 6, workers: int = 4) -> dict:
    questions = json.loads(path.read_text())
    todo = [q for q in questions if "$" not in q["stem_md"] or not q.get("polished")]
    chunks = [todo[i : i + chunk_size] for i in range(0, len(todo), chunk_size)]
    results: dict[str, PolishedQuestion] = {}
    errors = 0
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for out in ex.map(lambda c: _safe(c), chunks):
            if out is None:
                errors += 1
                continue
            for p in out:
                results[p.id] = p
    changed = 0
    for q in questions:
        p = results.get(q["id"])
        if not p:
            continue
        new_opts = [p.option_a, p.option_b, p.option_c, p.option_d]
        if p.stem_md != q["stem_md"] or any(o["text_md"] != n for o, n in zip(q["options"], new_opts)):
            changed += 1
        q["stem_md"] = p.stem_md
        for o, n in zip(q["options"], new_opts):
            o["text_md"] = n
        q["polished"] = True
    path.write_text(json.dumps(questions, indent=2, ensure_ascii=False) + "\n")
    return {"file": path.name, "questions": len(questions), "polished": len(results), "changed": changed, "failed_chunks": errors}


def _safe(chunk: list[dict]):
    try:
        return _polish_chunk(chunk)
    except Exception as e:  # noqa: BLE001
        print(f"chunk failed: {e}", file=sys.stderr)
        return None


def run_polish(paths: list[Path]) -> None:
    for p in paths:
        print(polish_file(p))
