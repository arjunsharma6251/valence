"use client";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type ButtonHTMLAttributes, type ReactNode } from "react";
import { IconChevron } from "./icons";

/* Editorial primitives: hairlines, air, one accent. Tap targets ≥44px. */

type Variant = "filled" | "outline" | "plain" | "destructive";
const variants: Record<Variant, string> = {
  filled: "bg-ink text-canvas hover:opacity-90",
  outline: "border border-line-strong text-ink hover:border-ink",
  plain: "text-ink-soft hover:text-ink",
  destructive: "text-red hover:bg-red-wash",
};
const base = "inline-flex items-center justify-center gap-2 rounded-[6px] min-h-[48px] px-5 text-[15px] font-medium transition-[background-color,border-color,opacity,transform] duration-150 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap";
const compact = "min-h-[44px] px-4 text-[14px]";

export function Button({ variant = "filled", size = "regular", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "regular" | "compact" }) {
  return <button className={`${base} ${size === "compact" ? compact : ""} ${variants[variant]} ${className}`} {...props} />;
}
export function LinkButton({ href, variant = "filled", size = "regular", className = "", children }: { href: string; variant?: Variant; size?: "regular" | "compact"; className?: string; children: ReactNode }) {
  return <Link href={href} className={`${base} ${size === "compact" ? compact : ""} ${variants[variant]} ${className}`}>{children}</Link>;
}

/** Page title in the serif. Hands its text to the top bar when it scrolls away. */
export function LargeTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const text = typeof children === "string" ? children : null;
  useEffect(() => {
    const el = ref.current;
    if (!el || !text) return;
    setBarTitle(text, false);
    const io = new IntersectionObserver(([e]) => setBarTitle(text, e.intersectionRatio < 1), { rootMargin: "-56px 0px 0px 0px", threshold: [1] });
    io.observe(el);
    return () => { io.disconnect(); setBarTitle(null, false); };
  }, [text]);
  return <h1 ref={ref} className={`serif text-[34px] md:text-[40px] font-medium leading-[1.1] tracking-[-0.015em] ${className}`}>{children}</h1>;
}
export function usePageTitle(title: string) {
  useEffect(() => { setBarTitle(title, true); return () => setBarTitle(null, false); }, [title]);
}
let barTitle: { text: string | null; visible: boolean } = { text: null, visible: false };
const EMPTY_BAR = { text: null, visible: false } as const;
const barListeners = new Set<() => void>();
function setBarTitle(text: string | null, visible: boolean) { barTitle = { text, visible }; for (const l of barListeners) l(); }
export function useBarTitle() {
  return useSyncExternalStore((l) => { barListeners.add(l); return () => { barListeners.delete(l); }; }, () => barTitle, () => EMPTY_BAR);
}

/** Narrow reading column for form-like screens. */
export function Narrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[680px] ${className}`}>{children}</div>;
}

/** Mono section label above a hairline list. */
export function GroupHeader({ children, trailing, caps = true }: { children: ReactNode; trailing?: ReactNode; caps?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 pt-10 pb-2">
      <h2 className={caps ? "mono" : "text-[13px] text-ink-soft"}>{children}</h2>
      {trailing && <span className="mono">{trailing}</span>}
    </div>
  );
}
export function GroupFooter({ children }: { children: ReactNode }) {
  return <p className="pt-3 text-[13px] text-grey leading-snug">{children}</p>;
}

/** A hairline list. Children stack with 1px lines; no box, no fill. */
export function Group({ children, className = "" }: { children: ReactNode; className?: string; insetIcon?: boolean }) {
  return <section className={`list border-y border-line ${className}`}>{children}</section>;
}

export function Row({ icon, title, detail, value, href, onClick, chevron, children, className = "", active = false }: {
  icon?: ReactNode; title: ReactNode; detail?: ReactNode; value?: ReactNode; href?: string; onClick?: () => void; chevron?: boolean; children?: ReactNode; className?: string; active?: boolean;
}) {
  const interactive = Boolean(href || onClick);
  const inner = (
    <>
      {icon && <span className="shrink-0 text-ink-soft [&>svg]:w-[18px] [&>svg]:h-[18px]">{icon}</span>}
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] truncate">{title}</span>
        {detail && <span className="block text-[13px] text-ink-soft truncate">{detail}</span>}
      </span>
      {value !== undefined && <span className="shrink-0 text-[15px] text-ink-soft tnum">{value}</span>}
      {children}
      {(chevron ?? Boolean(href)) && <IconChevron size={16} className="shrink-0 text-grey" />}
    </>
  );
  const cls = `flex items-center gap-4 w-full text-left min-h-[52px] py-3 ${interactive ? "hover:text-accent transition-[color] duration-100" : ""} ${active ? "text-accent" : ""} ${className}`;
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

/** Mono chip group used as a segmented control. */
export function Segmented<T extends string>({ value, onChange, options, label, className = "" }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex gap-1.5 ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`mono min-h-[36px] md:min-h-[32px] px-3 rounded-[3px] border transition-[border-color,color,background-color] duration-150 ${on ? "border-ink text-ink bg-canvas-2" : "border-line hover:border-line-strong"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tag({ tone = "neutral", children, className = "" }: { tone?: "neutral" | "accent" | "green" | "red" | "orange"; children: ReactNode; className?: string }) {
  const tones = { neutral: "text-ink-soft border-line", accent: "text-accent border-accent", green: "text-green border-green", red: "text-red border-red", orange: "text-orange border-orange" };
  return <span className={`mono inline-flex items-center rounded-[3px] border px-2 py-[3px] ${tones[tone]} ${className}`}>{children}</span>;
}
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[6px] bg-canvas-2 ${className}`} aria-hidden="true" />;
}
export function Kbd({ children, onAccent = false }: { children: ReactNode; onAccent?: boolean }) {
  return <kbd className={`hidden md:inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-[3px] font-mono text-[11px] ${onAccent ? "bg-canvas/20 text-canvas" : "border border-line text-grey"}`}>{children}</kbd>;
}
