import type { Metadata } from "next";
import { HomeScreen } from "./HomeScreen";

export const metadata: Metadata = { title: "Valence — free adaptive USNCO practice" };

export default function Page() {
  return <HomeScreen />;
}
