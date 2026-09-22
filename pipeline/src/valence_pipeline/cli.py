"""`valence-pipeline` command-line entry point."""

from __future__ import annotations

import argparse
from pathlib import Path


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="valence-pipeline", description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    e = sub.add_parser("extract", help="PDF -> page images -> questions.csv + answers.csv + figures/")
    e.add_argument("pdf", type=Path)
    e.add_argument("--year", type=int, required=True)
    e.add_argument("--level", choices=["local", "national"], required=True)
    e.add_argument("--out", type=Path, required=True, help="work directory, e.g. work/2024-local")

    t = sub.add_parser("text-extract", help="no-AI: PDF text layer -> questions.csv + answers.csv (keys parsed from the PDF)")
    t.add_argument("pdf", type=Path)
    t.add_argument("--year", type=int, required=True)
    t.add_argument("--level", choices=["local", "national"], required=True)
    t.add_argument("--out", type=Path, required=True)

    r = sub.add_parser("review", help="summarize a work directory and list problems to fix")
    r.add_argument("work", type=Path)

    i = sub.add_parser("import", help="reviewed CSVs -> content/questions/<year>-<level>.json")
    i.add_argument("work", type=Path)
    i.add_argument("--out", type=Path, required=True)

    d = sub.add_parser("draft-explanations", help="Batches API explanation drafts for a questions JSON")
    d.add_argument("questions_json", type=Path)
    d.add_argument("--out", type=Path, required=True)
    d.add_argument("--resume", metavar="BATCH_ID", help="skip submission and collect an existing batch")

    args = p.parse_args(argv)
    if args.cmd == "extract":
        from .extract import run_extract

        run_extract(args.pdf, args.year, args.level, args.out)
    elif args.cmd == "text-extract":
        from .textparse import text_extract

        print(text_extract(args.pdf, args.year, args.level, args.out))
    elif args.cmd == "review":
        from .review import run_review

        raise SystemExit(1 if run_review(args.work) else 0)
    elif args.cmd == "import":
        from .importer import run_import

        run_import(args.work, args.out)
    elif args.cmd == "draft-explanations":
        from .explain import run_draft

        run_draft(args.questions_json, args.out, args.resume)


if __name__ == "__main__":
    main()
