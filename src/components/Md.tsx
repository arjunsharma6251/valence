import { renderMd } from "@/lib/render";

/**
 * Renders mini-markdown + KaTeX. Works as a Server or Client Component.
 * `dangerouslySetInnerHTML` is safe here because renderMd escapes all text
 * and only KaTeX-generated markup is inserted.
 */
export function Md({ text, className = "" }: { text: string | null | undefined; className?: string }) {
  return <div className={`md ${className}`} dangerouslySetInnerHTML={{ __html: renderMd(text) }} />;
}
