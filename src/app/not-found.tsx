import { LargeTitle, LinkButton, Narrow } from "@/components/ui";

export default function NotFound() {
  return (
    <Narrow className="pt-1">
      <LargeTitle className="pb-2">Not found</LargeTitle>
      <p className="text-[16px] text-ink-soft pb-5">That page doesn’t exist.</p>
      <LinkButton href="/" variant="outline">Home</LinkButton>
    </Narrow>
  );
}
