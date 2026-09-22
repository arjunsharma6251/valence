"use client";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/* Small, explicit UI primitives. No component library: fewer moving parts
   and every style is visible here. Tap targets are ≥44px throughout. */

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-110 active:brightness-95 shadow-soft",
  secondary: "bg-elev text-fg border border-line-strong hover:bg-accent-wash",
  ghost: "text-muted hover:text-fg hover:bg-accent-wash",
  danger: "bg-bad-wash text-bad hover:brightness-95",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full min-h-11 px-5 text-[15px] font-medium transition-[background-color,filter,transform] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-2xl bg-elev border border-line shadow-soft p-5 ${className}`}>{children}</section>
  );
}

export function Pill({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: "neutral" | "accent" | "ok" | "bad";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-accent-wash text-muted",
    accent: "bg-accent-wash text-accent",
    ok: "bg-ok-wash text-ok",
    bad: "bg-bad-wash text-bad",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-[0.12em] text-faint">{children}</p>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-accent-wash ${className}`} />;
}
