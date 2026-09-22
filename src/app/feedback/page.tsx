import type { Metadata } from "next";
import { Group, GroupFooter, GroupHeader, LargeTitle, Row, Narrow } from "@/components/ui";

export const metadata: Metadata = { title: "Feedback" };

export default function Page() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <Narrow>
      <LargeTitle className="pt-1 pb-4">Feedback</LargeTitle>
      <Group>
        <Row title="Wrong answer or confusing explanation?" detail="Use Flag under any question. It goes straight to the review queue." />
      </Group>
      <GroupHeader>Anything else</GroupHeader>
      <Group>
        {email && <Row href={`mailto:${email}?subject=Valence%20feedback`} title="Email" detail={email} />}
        <Row href="https://github.com/arjunsharma6251/valence/issues/new" title="Open a GitHub issue" detail="Bugs, missing features, questions you’d like to see" />
      </Group>
      <GroupFooter>If you’re a USNCO alum or finalist and want to verify explanations for a topic, get in touch and we’ll add you to the editor allowlist.</GroupFooter>
    </Narrow>
  );
}
