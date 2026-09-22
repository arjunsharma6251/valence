import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto max-w-[640px] px-4 py-10 text-xs text-faint leading-relaxed">
      <p>
        Valence is a free, independent practice tool. It is not affiliated with or endorsed by the American Chemical
        Society. Exam-derived questions are attributed to their source; original questions are marked as such.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/feedback" className="hover:text-fg">Feedback</Link>
        <Link href="/search" className="hover:text-fg">Search questions</Link>
        <Link href="/signin" className="hover:text-fg">Sign in</Link>
        <a href="https://github.com/arjunsharma6251/valence" className="hover:text-fg">Source</a>
      </p>
    </footer>
  );
}
