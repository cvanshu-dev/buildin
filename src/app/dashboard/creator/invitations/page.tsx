import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { CreatorInvitations } from "@/components/creator-invitations";
export const dynamic = "force-dynamic";
export default async function CreatorInvitationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") redirect("/dashboard");
  return <DashboardShell title="Invitations" role="Creator"><CreatorInvitations/></DashboardShell>;
}
