"use client";
import { useStore } from "@/lib/store";
import { setTheme } from "@/lib/store/actions";
import { track } from "@/lib/analytics";

const opts = [
  { v: "system", label: "Auto" },
  { v: "light", label: "Light" },
  { v: "dark", label: "Dark" },
] as const;

export function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-full border border-line p-0.5 bg-elev">
      {opts.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={theme === o.v}
          onClick={() => { setTheme(o.v); track("theme_changed", { theme: o.v }); }}
          className={`min-h-9 px-3 rounded-full text-[13px] font-medium transition-colors ${theme === o.v ? "bg-accent-wash text-accent" : "text-muted hover:text-fg"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
