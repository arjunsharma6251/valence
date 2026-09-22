import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuestion, getTopic, questions } from "@/lib/content";
import { QuestionDetail } from "./QuestionDetail";
import { texToPlain } from "@/lib/texplain";

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
  const plain = texToPlain(q.stem_md).slice(0, 160);
  const title = `${topic} · ${q.year} ${q.level === "local" ? "local" : "national"}`;
  return { title, description: plain, openGraph: { title: "Can you get this USNCO question?", description: plain }, twitter: { card: "summary_large_image" } };
}

export default async function Page({ params, searchParams }: PageProps<"/q/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const q = getQuestion(id);
  if (!q) notFound();
  return <QuestionDetail question={q} challenge={sp.c === "1"} />;
}
