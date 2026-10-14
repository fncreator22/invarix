import type { Metadata } from "next";
import { HomeScreen } from "@/components/home/home-screen";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return <HomeScreen />;
}
