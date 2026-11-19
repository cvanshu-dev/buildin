import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileWorkspace } from "@/components/profile-workspace";
import { CreatorProfileVisibility } from "@/components/creator-profile-visibility";

export default async function CreatorDashboard() {
  const user = await getCurrentUser();

  if (!user || user.role !== "CREATOR") redirect("/dashboard");

  return (
    <DashboardShell title="Creator workspace" role="Creator">
      <ProfileWorkspace type="CREATOR" />
      <CreatorProfileVisibility />
    </DashboardShell>
  );
}
