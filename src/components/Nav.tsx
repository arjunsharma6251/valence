"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDueCards } from "@/lib/store/derived";
import { useBarTitle } from "./ui";
import { IconMock, IconPartII, IconPerson, IconPractice, IconReview } from "./icons";

const items = [
  { href: "/practice", label: "Practice", Icon: IconPractice },
  { href: "/mock", label: "Mock", Icon: IconMock },
  { href: "/review", label: "Review", Icon: IconReview },
  { href: "/part2", label: "Part II", Icon: IconPartII },
];

/**
 * Navigation: a slim top bar (wordmark → home, account glyph) everywhere;
 * the four destinations live in a bottom tab bar on phones and move into
 * the top bar as a pill group from md up. Only four destinations, ever.
 */
export function TopBar() {
  const path = usePathname();
  const bar = useBarTitle();
  return (
    <header className="sticky top-0 z-30 bg-ground/92 backdrop-blur-xl border-b border-sep">
      <div className="mx-auto max-w-[640px] px-4 h-[52px] flex items-center gap-2 relative">
        <span aria-hidden="true" className={`md:hidden absolute left-1/2 -translate-x-1/2 max-w-[52%] truncate whitespace-nowrap text-headline font-semibold transition-opacity duration-150 pointer-events-none ${bar.visible && bar.text ? "opacity-100" : "opacity-0"}`}>
          {bar.text}
        </span>
        <Link href="/" className="font-semibold tracking-[-0.01em] text-headline min-h-[44px] inline-flex items-center pr-2" aria-label="Valence home">
          Valence
        </Link>
        <nav className="hidden md:flex items-center gap-0.5 ml-4" aria-label="Primary">
          {items.map(({ href, label }) => {
            const on = path === href || path.startsWith(href + "/");
            return (
              <Link key={href} href={href} className={`min-h-[36px] px-3 rounded-full text-subhead font-medium inline-flex items-center transition-colors ${on ? "bg-accent-tint text-accent" : "text-label-2 hover:text-label hover:bg-fill/70"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
        <Link href="/signin" className="ml-auto text-accent min-h-[44px] min-w-[44px] inline-flex items-center justify-center -mr-2" aria-label="Account">
          <IconPerson size={22} />
        </Link>
      </div>
    </header>
  );
}

export function TabBar() {
  const path = usePathname();
  const due = useDueCards().length;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-ground/92 backdrop-blur-xl border-t border-sep pb-[env(safe-area-inset-bottom)]" aria-label="Primary">
      <ul className="grid grid-cols-4 h-[56px]">
        {items.map(({ href, label, Icon }) => {
          const on = path === href || path.startsWith(href + "/");
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} className={`relative h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${on ? "text-accent" : "text-label-2"}`}>
                <Icon size={24} strokeWidth={on ? 2.4 : 1.8} />
                {label}
                {href === "/review" && due > 0 && (
                  <span className="absolute top-[7px] left-[calc(50%+6px)] min-w-[18px] h-[18px] px-1 rounded-full bg-red text-white text-[11px] leading-[18px] text-center font-semibold tnum">{due > 99 ? "99+" : due}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
