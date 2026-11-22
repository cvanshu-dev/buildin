import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileWorkspace } from "@/components/profile-workspace";
import { CreatorProfileVisibility } from "@/components/creator-profile-visibility";
import { CreatorDashboardWorkspace } from "@/components/creator-dashboard-workspace";
export default async function CreatorDashboard() {
  const user=await getCurrentUser();
  if(!user||user.role!=="CREATOR") redirect("/dashboard");
  return <DashboardShell title="Creator workspace" role="Creator">
    <div className="mt-5 flex flex-wrap gap-3">
      <Link className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white" href="/dashboard/creator/campaigns">Browse campaigns</Link>
      <Link className="rounded-full border border-white/20 px-5 py-2 text-sm" href="/discover">Discover creators</Link>
      <a className="rounded-full border border-white/20 px-5 py-2 text-sm" href="#collaborations">My collaborations</a>
      <a className="rounded-full border border-white/20 px-5 py-2 text-sm" href="#notifications">Notifications</a>
    </div>
    <CreatorDashboardWorkspace/>
    <ProfileWorkspace type="CREATOR"/>
    <CreatorProfileVisibility/>
  </DashboardShell>;
}
