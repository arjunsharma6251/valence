import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { frq, getFrq } from "@/lib/content";
import { FrqScreen } from "./FrqScreen";

export function generateStaticParams() {
  return frq.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/part2/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = getFrq(id);
  return { title: p ? p.title : "Part II" };
}

export default async function Page({ params }: PageProps<"/part2/[id]">) {
  const { id } = await params;
  const problem = getFrq(id);
  if (!problem) notFound();
  return <FrqScreen problem={problem} />;
}
