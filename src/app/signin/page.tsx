import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInScreen } from "./SignInScreen";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <Suspense>
      <SignInScreen />
    </Suspense>
  );
}
