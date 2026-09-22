import type { Metadata } from "next";
import { MockScreen } from "./MockScreen";

export const metadata: Metadata = { title: "Mock exam" };

export default function Page() {
  return <MockScreen />;
}
