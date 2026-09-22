import type { Metadata } from "next";
import { Card, Eyebrow } from "@/components/ui";

export const metadata: Metadata = { title: "Feedback" };

export default function Page() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <div className="space-y-4">
      <h1 className="text-[24px] font-semibold tracking-tight">Feedback</h1>
      <Card className="space-y-3 text-[15px] leading-relaxed">
        <p>Found a wrong answer or a confusing explanation? Use the <strong>Flag</strong> button under any question; it goes straight to the review queue.</p>
        <p>Anything else — a bug, a missing feature, a question you’d like to see:</p>
        <ul className="list-disc pl-5 space-y-1">
          {email && <li><a className="text-accent hover:underline" href={`mailto:${email}?subject=Valence%20feedback`}>Email {email}</a></li>}
          <li><a className="text-accent hover:underline" href="https://github.com/arjunsharma6251/valence/issues/new">Open a GitHub issue</a></li>
        </ul>
        <Eyebrow>Contributing explanations</Eyebrow>
        <p className="text-[14px] text-muted">If you’re a USNCO alum or finalist and want to verify explanations for a topic, get in touch and we’ll add you to the editor allowlist.</p>
      </Card>
    </div>
  );
}
