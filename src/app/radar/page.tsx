import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { RadarClient } from "@/components/radar-client";
import { getRadarItems } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";

export default async function RadarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <div className="min-h-screen pb-24 md:pb-0"><Navbar /><main className="mx-auto max-w-6xl px-4 py-9 sm:px-6"><RadarClient initialItems={await getRadarItems(user.id)} /></main></div>;
}
