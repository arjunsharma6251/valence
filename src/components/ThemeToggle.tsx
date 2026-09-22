"use client";
import { Segmented } from "./ui";
import { useStore } from "@/lib/store";
import { setTheme } from "@/lib/store/actions";
import { track } from "@/lib/analytics";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useStore((s) => s.theme);
  return (
    <Segmented
      label="Appearance"
      className={className}
      value={theme}
      onChange={(v) => { setTheme(v); track("theme_changed", { theme: v }); }}
      options={[
        { value: "system", label: "Auto" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
}
