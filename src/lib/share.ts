"use client";
import { track } from "./analytics";

/**
 * Sharing helpers. Web Share API on phones (opens the system share sheet,
 * including files for the score card); clipboard fallback on desktop.
 * Returns what happened so the UI can confirm without a modal.
 */
export type ShareResult = "shared" | "copied" | "cancelled" | "unsupported";

export async function shareLink(input: { title: string; text?: string; url: string; kind: "question" | "challenge" | "mock" | "group" }): Promise<ShareResult> {
  const url = input.url.startsWith("http") ? input.url : `${location.origin}${input.url}`;
  try {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      await navigator.share({ title: input.title, text: input.text, url });
      track("share", { kind: input.kind, via: "share_sheet" });
      return "shared";
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled";
  }
  try {
    await navigator.clipboard.writeText(url);
    track("share", { kind: input.kind, via: "clipboard" });
    return "copied";
  } catch {
    return "unsupported";
  }
}

/** Share a PNG (the score card) as a file when the platform allows it, else download it. */
export async function shareImage(imageUrl: string, filename: string, fallbackUrl: string, title: string): Promise<ShareResult> {
  try {
    const blob = await (await fetch(imageUrl)).blob();
    const file = new File([blob], filename, { type: "image/png" });
    if ("canShare" in navigator && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text: `${title} ${location.origin}${fallbackUrl}` });
      track("share", { kind: "mock", via: "share_sheet_file" });
      return "shared";
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    track("share", { kind: "mock", via: "download" });
    return "shared";
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled";
    return shareLink({ title, url: fallbackUrl, kind: "mock" });
  }
}
