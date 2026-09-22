import type { Metadata } from "next";
import { Suspense } from "react";
import { PracticeScreen } from "./PracticeScreen";

export const metadata: Metadata = { title: "Practice" };

export default function Page() {
  return (
    <Suspense>
      <PracticeScreen />
    </Suspense>
  );
}
