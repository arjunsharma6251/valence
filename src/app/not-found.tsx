import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-20 text-center space-y-4">
      <h1 className="text-[22px] font-semibold tracking-tight">That page doesn’t exist.</h1>
      <LinkButton href="/">Home</LinkButton>
    </div>
  );
}
