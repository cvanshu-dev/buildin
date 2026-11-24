import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { CreatorDashboardWorkspace } from "@/components/creator-dashboard-workspace";
export const dynamic = "force-dynamic";
export default async function CreatorDashboard() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") redirect("/dashboard");
  return <DashboardShell title="Home" role="Creator"><CreatorDashboardWorkspace/></DashboardShell>;
}
