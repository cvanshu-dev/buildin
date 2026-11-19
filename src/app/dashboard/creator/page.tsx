import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileWorkspace } from "@/components/profile-workspace";
import { CreatorProfileVisibility } from "@/components/creator-profile-visibility";
export default async function CreatorDashboard() {
 const user=await getCurrentUser(); if(!user||user.role!=="CREATOR") redirect("/dashboard");
 return <DashboardShell title="Creator workspace" role="Creator"><div className="mt-5 flex gap-3"><Link className="rounded-full bg-lime-300 px-5 py-2 text-sm font-semibold text-black" href="/dashboard/creator/campaigns">Browse campaigns</Link><Link className="rounded-full border border-white/20 px-5 py-2 text-sm" href="/discover">Discover creators</Link></div><ProfileWorkspace type="CREATOR"/><CreatorProfileVisibility/></DashboardShell>;
}
