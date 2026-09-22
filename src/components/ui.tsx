"use client";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type ButtonHTMLAttributes, type ReactNode } from "react";
import { IconChevron } from "./icons";

/*
  Primitives in the iOS grouped-table language. Every control here has
  default, hover, active, focus, and disabled states; tap targets ≥44px.
*/

type Variant = "filled" | "tinted" | "plain" | "destructive";

const variants: Record<Variant, string> = {
  filled: "bg-accent text-accent-on hover:brightness-105 active:brightness-95",
  tinted: "bg-accent-tint text-accent hover:bg-accent-tint-2 active:bg-accent-tint",
  plain: "text-accent hover:bg-accent-tint active:bg-accent-tint-2",
  destructive: "bg-red-tint text-red hover:brightness-95",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full min-h-[50px] px-5 text-body font-semibold transition-[background-color,filter,transform] duration-150 active:scale-[0.985] disabled:opacity-40 disabled:pointer-events-none select-none";
const compact = "min-h-[44px] px-4 text-subhead rounded-full whitespace-nowrap";

export function Button({
  variant = "filled",
  size = "regular",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "regular" | "compact" }) {
  return <button className={`${base} ${size === "compact" ? compact : ""} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  href,
  variant = "filled",
  size = "regular",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: "regular" | "compact";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${size === "compact" ? compact : ""} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

/**
 * Large Title, the page's one heading. When it scrolls out of view the top
 * bar shows the same title, as UIKit does; see usePageTitle.
 */
export function LargeTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const text = typeof children === "string" ? children : null;
  useEffect(() => {
    const el = ref.current;
    if (!el || !text) return;
    setBarTitle(text, false);
    const io = new IntersectionObserver(([e]) => setBarTitle(text, e.intersectionRatio < 1), { rootMargin: "-52px 0px 0px 0px", threshold: [1] });
    io.observe(el);
    return () => { io.disconnect(); setBarTitle(null, false); };
  }, [text]);
  return <h1 ref={ref} className={`text-large-title font-bold tracking-[-0.02em] ${className}`}>{children}</h1>;
}

/** Screens without a Large Title (Practice, a running mock) name themselves in the bar. */
export function usePageTitle(title: string) {
  useEffect(() => {
    setBarTitle(title, true);
    return () => setBarTitle(null, false);
  }, [title]);
}

// ---- top-bar title registry (tiny external store) --------------------------
let barTitle: { text: string | null; visible: boolean } = { text: null, visible: false };
const EMPTY_BAR = { text: null, visible: false } as const;
const barListeners = new Set<() => void>();
function setBarTitle(text: string | null, visible: boolean) {
  barTitle = { text, visible };
  for (const l of barListeners) l();
}
export function useBarTitle() {
  return useSyncExternalStore(
    (l) => { barListeners.add(l); return () => { barListeners.delete(l); }; },
    () => barTitle,
    () => EMPTY_BAR,
  );
}

/** Section header for a grouped list (UITableView style): small, secondary, above the group. */
export function GroupHeader({ children, trailing, caps = true }: { children: ReactNode; trailing?: ReactNode; caps?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 pb-1.5 pt-6 first:pt-0">
      <h2 className={`text-footnote font-medium text-label-2 ${caps ? "uppercase tracking-[0.04em]" : ""}`}>{children}</h2>
      {trailing && <span className="text-footnote text-label-2">{trailing}</span>}
    </div>
  );
}

export function GroupFooter({ children }: { children: ReactNode }) {
  return <p className="px-4 pt-1.5 text-footnote text-label-2 leading-snug">{children}</p>;
}

/** Inset grouped container. Children stack with hairline separators. */
export function Group({ children, className = "", insetIcon = false }: { children: ReactNode; className?: string; insetIcon?: boolean }) {
  return (
    <section className={`group-list ${insetIcon ? "inset-icon" : ""} rounded-[var(--radius-group)] bg-group overflow-hidden ${className}`}>
      {children}
    </section>
  );
}

/** A 44px+ row. Renders as a link, a button, or a static row depending on props. */
export function Row({
  icon,
  title,
  detail,
  value,
  href,
  onClick,
  chevron,
  children,
  className = "",
  active = false,
}: {
  icon?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  value?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  children?: ReactNode;
  className?: string;
  active?: boolean;
}) {
  const interactive = Boolean(href || onClick);
  const inner = (
    <>
      {icon && <span className="shrink-0 w-7 h-7 rounded-[7px] bg-accent-tint text-accent inline-flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]">{icon}</span>}
      <span className="flex-1 min-w-0">
        <span className="block text-body truncate">{title}</span>
        {detail && <span className="block text-footnote text-label-2 truncate">{detail}</span>}
      </span>
      {value !== undefined && <span className="shrink-0 text-body text-label-2 tnum">{value}</span>}
      {children}
      {(chevron ?? Boolean(href)) && <IconChevron size={18} className="shrink-0 text-label-3 -mr-1" />}
    </>
  );
  const cls = `flex items-center gap-3 w-full text-left px-4 min-h-[44px] py-2.5 ${interactive ? "hover:bg-fill/60 active:bg-fill transition-[background-color] duration-100" : ""} ${active ? "bg-accent-tint" : ""} ${className}`;
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

/** Native-style segmented control. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-[12px] md:rounded-[10px] bg-fill p-[2px] ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`min-h-[44px] md:min-h-[36px] min-w-[44px] px-3 rounded-[8px] text-subhead font-medium transition-[background-color,box-shadow,color] duration-150 ${
              on ? "bg-group text-label shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-label-2 hover:text-label"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tag({ tone = "neutral", children, className = "" }: { tone?: "neutral" | "accent" | "green" | "red" | "orange"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-fill text-label-2",
    accent: "bg-accent-tint text-accent",
    green: "bg-green-tint text-green",
    red: "bg-red-tint text-red",
    orange: "bg-orange-tint text-orange",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-[2px] text-caption font-semibold ${tones[tone]} ${className}`}>{children}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-group)] bg-group ${className}`} aria-hidden="true" />;
}

/** Keyboard hint shown on desktop only. `onAccent` tints it from the filled button's foreground. */
export function Kbd({ children, onAccent = false }: { children: ReactNode; onAccent?: boolean }) {
  return (
    <kbd className={`hidden md:inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-[5px] text-caption font-medium ${onAccent ? "bg-accent-on/20 text-accent-on" : "bg-fill text-label-2"}`}>
      {children}
    </kbd>
  );
}
