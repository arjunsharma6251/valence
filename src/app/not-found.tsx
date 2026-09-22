import { LargeTitle, LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="pt-1">
      <LargeTitle className="pb-2">Not found</LargeTitle>
      <p className="text-body text-label-2 pb-5">That page doesn’t exist.</p>
      <LinkButton href="/" variant="tinted">Home</LinkButton>
    </div>
  );
}
