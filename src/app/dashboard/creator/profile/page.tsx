import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileWorkspace } from "@/components/profile-workspace";
import { CreatorProfileVisibility } from "@/components/creator-profile-visibility";
export const dynamic = "force-dynamic";
export default async function CreatorProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") redirect("/dashboard");
  return <DashboardShell title="My profile" role="Creator">
    <div className="mb-6 max-w-3xl"><p className="text-sm leading-6 text-slate-600">Manage the public identity brands see when they discover you. Keep your profile, work samples and social links accurate.</p></div>
    <ProfileWorkspace type="CREATOR"/>
    <CreatorProfileVisibility/>
  </DashboardShell>;
}
