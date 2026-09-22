"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDueCards } from "@/lib/store/derived";
import { IconMock, IconPartII, IconPerson, IconPractice, IconReview } from "./icons";
import { useBarTitle } from "./ui";

const items = [
  { href: "/practice", label: "Practice", Icon: IconPractice },
  { href: "/mock", label: "Mock", Icon: IconMock },
  { href: "/review", label: "Review", Icon: IconReview },
  { href: "/part2", label: "Part II", Icon: IconPartII },
];

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span className="serif font-[620] tracking-[-0.015em] leading-none" style={{ fontSize: size }}>
      valence<span className="text-accent">.</span>
    </span>
  );
}

/** Canvas-colored sticky bar; earns a whisper of shadow once the page scrolls under it. */
export function TopBar() {
  const path = usePathname();
  const bar = useBarTitle();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`sticky top-0 z-30 bg-canvas transition-shadow duration-200 ${scrolled ? "shadow-soft" : ""}`}>
      <div className="mx-auto max-w-[1040px] px-5 md:px-7 h-[56px] md:h-[64px] flex items-center gap-2 relative">
        <span aria-hidden="true" className={`md:hidden absolute left-1/2 -translate-x-1/2 max-w-[50%] truncate whitespace-nowrap text-[15px] font-medium transition-opacity duration-150 pointer-events-none ${bar.visible && bar.text ? "opacity-100" : "opacity-0"}`}>{bar.text}</span>
        <Link href="/" className="min-h-[44px] inline-flex items-center pr-2" aria-label="Valence home"><Wordmark /></Link>
        <nav className="hidden md:flex items-center gap-7 ml-10" aria-label="Primary">
          {items.map(({ href, label }) => {
            const on = path === href || path.startsWith(href + "/");
            return (
              <Link key={href} href={href} className={`min-h-[44px] inline-flex items-center text-[15px] border-b transition-[color,border-color] duration-150 ${on ? "text-ink border-accent" : "text-ink-soft border-transparent hover:text-ink"}`}>{label}</Link>
            );
          })}
        </nav>
        <Link href="/signin" className="ml-auto text-ink-soft hover:text-ink min-h-[44px] min-w-[44px] inline-flex items-center justify-center -mr-2" aria-label="Account"><IconPerson size={20} /></Link>
      </div>
    </header>
  );
}

export function TabBar() {
  const path = usePathname();
  const due = useDueCards().length;
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-canvas border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="Primary">
      <ul className="grid grid-cols-4 h-[56px]">
        {items.map(({ href, label, Icon }) => {
          const on = path === href || path.startsWith(href + "/");
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} className={`relative h-full flex flex-col items-center justify-center gap-1 mono text-[10px] ${on ? "text-ink" : "text-grey"}`}>
                <Icon size={22} strokeWidth={on ? 2.2 : 1.7} className={on ? "animate-pop" : ""} />
                {label}
                {href === "/review" && due > 0 && <span className="absolute top-[6px] left-[calc(50%+6px)] min-w-[16px] h-[16px] px-1 rounded-full bg-ink text-canvas text-[10px] leading-[16px] text-center font-mono">{due > 99 ? "99+" : due}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
