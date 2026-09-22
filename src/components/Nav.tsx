"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDueCards } from "@/lib/store/derived";

const items = [
  { href: "/practice", label: "Practice" },
  { href: "/mock", label: "Mock" },
  { href: "/review", label: "Review" },
  { href: "/part2", label: "Part II" },
];

/** The four top-level destinations. Home is the wordmark. */
export function Nav() {
  const path = usePathname();
  const due = useDueCards().length;
  return (
    <nav className="sticky top-0 z-20 bg-bg/85 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-[640px] px-4 h-14 flex items-center gap-1">
        <Link href="/" className="font-semibold tracking-tight text-[17px] mr-auto min-h-11 inline-flex items-center pr-2">
          Valence
        </Link>
        {items.map((it) => {
          const active = path === it.href || path.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`relative inline-flex items-center min-h-11 px-3 rounded-full text-[14px] font-medium transition-colors ${
                active ? "text-accent bg-accent-wash" : "text-muted hover:text-fg"
              }`}
            >
              {it.label}
              {it.href === "/review" && due > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-accent text-accent-fg text-[11px] leading-none h-4 min-w-4 px-1">
                  {due}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
