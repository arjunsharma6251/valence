import type { Metadata } from "next";
import Link from "next/link";
import { Group, GroupFooter, GroupHeader, LargeTitle, Narrow, Row } from "@/components/ui";
import { explanations, frq, questions } from "@/lib/content";
import { PREDICTION_MIN } from "@/lib/predict";

export const metadata: Metadata = {
  title: "What Valence does",
  description: "Every past USNCO question, adaptive practice, and AI-graded Part II free response. Free, no account needed.",
};

export default function Page() {
  const real = questions.filter((q) => !q.id.startsWith("seed-"));
  const years = real.map((q) => q.year);
  const span = `${Math.min(...years)}–${Math.max(...years)}`;
  const figures = real.filter((q) => q.figure_url).length;
  const problems = frq.length;
  const explained = explanations.filter((e) => !e.question_id.startsWith("seed-")).length;
  const items = [
    {
      name: "Every past exam",
      detail: `${real.length.toLocaleString()} questions from USNCO local and national Part I, ${span}, with the ${figures} figures, graphs and structures they depend on. Every question is tagged to the official ten topic blocks and attributed to its exam and number.`,
    },
    {
      name: "Part II, graded",
      detail: `${problems} free-response problems from national Part II. Type an answer per sub-part and get points against the official key and a rubric, with what was missing and the mistake you likely made. Nobody else grades Part II.`,
    },
    {
      name: "Practice that adapts",
      detail: "Each question is chosen from what you have missed, what you have not seen, and how hard the field found it. A per-topic rating updates after every answer, so the weak spots surface on their own.",
    },
    {
      name: "An explanation for everything",
      detail: `${explained.toLocaleString()} explanations: a worked path to the answer and a line on why each wrong option is wrong. Drafted by a model, marked as drafts until a verifier signs off.`,
    },
    {
      name: "Real mock exams",
      detail: "60 questions in the real format and topic order, on the real clock: 110 minutes for local, 90 for national. The timer survives a refresh. Your score is broken down by topic and the misses go to Review.",
    },
    {
      name: "A predicted score",
      detail: `After ${PREDICTION_MIN} answers, an estimate of your local or national score, labelled rough until there is enough data. Missed questions come back on a spaced schedule so they stay learned.`,
    },
  ];
  return (
    <Narrow>
      <LargeTitle className="pt-1 pb-2">What Valence does</LargeTitle>
      <p className="max-w-[52ch] text-[15px] text-ink-soft leading-relaxed pb-8">
        One place to prepare for the U.S. National Chemistry Olympiad. Free, no account needed, and your progress stays on this device until you sign in.
      </p>
      <ol className="stagger">
        {items.map((it, i) => (
          <li key={it.name} className="border-t border-line py-5 md:grid md:grid-cols-[72px_minmax(0,1fr)] md:gap-x-6">
            <span className="mono block">0{i + 1}</span>
            <div>
              <h2 className="serif text-[24px] md:text-[26px] leading-none tracking-[-0.01em] mt-3 md:mt-0">{it.name}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft max-w-[58ch]">{it.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10"><GroupHeader>Start</GroupHeader></div>
      <Group>
        <Row href="/practice" title="Practice" detail="Ten questions takes about three minutes" />
        <Row href="/part2" title="Part II" detail="Pick a problem, type an answer, get graded" />
        <Row href="/mock" title="Mock exam" detail="The full 60, timed" />
      </Group>
      <GroupFooter>
        Questions are © American Chemical Society, reproduced for non-commercial practice; Valence is not affiliated with ACS. If you are a USNCO alum and want to verify explanations, <Link href="/feedback" className="text-accent">get in touch</Link>.
      </GroupFooter>
    </Narrow>
  );
}
