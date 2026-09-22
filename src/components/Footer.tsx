import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto max-w-[640px] px-4 pt-8 pb-[calc(56px+env(safe-area-inset-bottom)+24px)] md:pb-10 text-footnote text-label-2 leading-snug">
      <p>
        Valence is a free, independent practice tool and is not affiliated with or endorsed by the American Chemical Society. Exam-derived questions are attributed to their source; original questions are marked as such.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/feedback" className="text-accent">Feedback</Link>
        <Link href="/search" className="text-accent">Search</Link>
        <a href="https://github.com/arjunsharma6251/valence" className="text-accent">Source</a>
      </p>
    </footer>
  );
}
