import type { Metadata } from "next";
import { Group, GroupFooter, LargeTitle, Narrow, Row } from "@/components/ui";

export const metadata: Metadata = { title: "Unsubscribed" };

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <Narrow>
      <LargeTitle className="pt-1 pb-4">{error ? "That link didn't work" : "You're unsubscribed"}</LargeTitle>
      <Group>
        {error ? (
          <Row href="/signin" title="Turn reminders off under Account" detail="The unsubscribe link was missing or already used." />
        ) : (
          <Row href="/signin" title="No more reminder emails" detail="Turn them back on any time under Account." />
        )}
      </Group>
      <GroupFooter>Your progress and account are unchanged.</GroupFooter>
    </Narrow>
  );
}
