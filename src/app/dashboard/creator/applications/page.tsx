import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { CreatorSectionWorkspace } from "@/components/creator-section-workspace";
export const dynamic = "force-dynamic";
export default async function CreatorApplicationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") redirect("/dashboard");
  return <DashboardShell title="Applications" role="Creator"><CreatorSectionWorkspace section="applications"/></DashboardShell>;
}
