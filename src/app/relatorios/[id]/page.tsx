import { notFound, redirect } from "next/navigation";
import { ReportView } from "@/components/report-view";
import { getPlanning } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const planning = await getPlanning(user.id, (await params).id);
  if (!planning) notFound();
  return <ReportView planning={planning} user={user} />;
}
