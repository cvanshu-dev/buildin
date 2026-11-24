import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { CreatorCollaborationWorkspace } from "@/components/creator-collaboration-workspace";
import { CollaborationLifecycle } from "@/components/collaboration-lifecycle";
export const dynamic = "force-dynamic";
export default async function CreatorCollaborationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") redirect("/dashboard");
  const { id } = await params;
  const access = await prisma.collaboration.findFirst({ where: { id, creatorProfile: { userId: user.id } }, select: { id: true } });
  if (!access) notFound();
  return <DashboardShell title="Collaboration workspace" role="Creator"><div className="space-y-6"><CreatorCollaborationWorkspace id={id} /><CollaborationLifecycle id={id} role="CREATOR" /></div></DashboardShell>;
}