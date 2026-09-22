import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuestion, getTopic, questions } from "@/lib/content";
import { QuestionDetail } from "./QuestionDetail";

/**
 * Question detail: a shareable, server-rendered page (good for links and
 * previews) that hands the interactive card to a Client Component.
 */
export function generateStaticParams() {
  return questions.map((q) => ({ id: q.id }));
}

export async function generateMetadata({ params }: PageProps<"/q/[id]">): Promise<Metadata> {
  const { id } = await params;
  const q = getQuestion(id);
  if (!q) return { title: "Question" };
  const topic = getTopic(q.topic_id)?.name ?? "";
  const plain = q.stem_md.replace(/\$[^$]*\$/g, "…").replace(/\*\*/g, "").slice(0, 120);
  return { title: `${topic} · ${q.year} ${q.level}`, description: plain };
}

export default async function Page({ params }: PageProps<"/q/[id]">) {
  const { id } = await params;
  const q = getQuestion(id);
  if (!q) notFound();
  return <QuestionDetail question={q} />;
}
