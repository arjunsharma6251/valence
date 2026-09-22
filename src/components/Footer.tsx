import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1040px] px-5 md:px-7 pt-16 pb-[calc(56px+env(safe-area-inset-bottom)+28px)] md:pb-12">
      <div className="hairline pt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 mono">
        <span>Not affiliated with ACS</span>
        <Link href="/about" className="hover:text-ink">About</Link>
        <Link href="/feedback" className="hover:text-ink">Feedback</Link>
        <Link href="/search" className="hover:text-ink">Search</Link>
        <a href="https://github.com/arjunsharma6251/valence" className="hover:text-ink">Source</a>
      </div>
    </footer>
  );
}
