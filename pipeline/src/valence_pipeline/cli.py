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

    po = sub.add_parser("polish", help="rewrite plain-text chemistry in content JSON files into KaTeX/mhchem (wording preserved)")
    po.add_argument("files", type=Path, nargs="+")

    fx = sub.add_parser("frq-extract", help="Part II PDF (problems + solutions) -> content/frq/<year>-national.json")
    fx.add_argument("pdf", type=Path)
    fx.add_argument("--year", type=int, required=True)
    fx.add_argument("--out", type=Path, required=True)
    fx.add_argument("--held", type=Path, default=Path("work/frq-held.json"))

    fg = sub.add_parser("figures", help="crop figures from the PDF for questions that reference one; adds held drawing-option questions")
    fg.add_argument("content", type=Path, help="content/questions/<year>-<level>.json")
    fg.add_argument("--pdf", type=Path, required=True)
    fg.add_argument("--work", type=Path, required=True, help="raw work dir with questions.csv (page numbers) and answers.csv")
    fg.add_argument("--year", type=int, required=True)
    fg.add_argument("--level", choices=["local", "national"], required=True)
    fg.add_argument("--out", type=Path, default=Path("../public/figures"))
    fg.add_argument("--id-suffix", default="")
    fg.add_argument("--dry-run", action="store_true")
    fg.add_argument("--redo", action="store_true", help="re-crop questions that already have a figure_url")

    ff = sub.add_parser("frq-figures", help="recover held Part II sub-parts by cropping their figures from the PDF")
    ff.add_argument("--year", type=int, required=True)
    ff.add_argument("--pdf", type=Path, required=True)
    ff.add_argument("--content", type=Path, required=True)
    ff.add_argument("--held", type=Path, required=True)
    ff.add_argument("--out", type=Path, default=Path("../public/figures"))

    da = sub.add_parser("draft-all", help="incremental explanation drafts for every content/questions/20*.json (re-runnable)")
    da.add_argument("--questions", type=Path, default=Path("../content/questions"))
    da.add_argument("--out", type=Path, default=Path("../content/explanations"))

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
    elif args.cmd == "polish":
        from .polish import run_polish

        run_polish(args.files)
    elif args.cmd == "frq-extract":
        from .frq import run_frq_extract

        run_frq_extract(args.pdf, args.year, args.out, args.held)
    elif args.cmd == "figures":
        from .figures import run_figures

        run_figures(args.content, args.pdf, args.work, args.year, args.level, args.out, args.id_suffix, dry_run=args.dry_run, redo=args.redo)
    elif args.cmd == "frq-figures":
        from .frqfig import run_frq_figures

        run_frq_figures(args.year, args.pdf, args.content, args.held, args.out)
    elif args.cmd == "draft-all":
        from .explain import run_draft_all

        run_draft_all(args.questions, args.out)
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
