import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { CreatorCollaborationWorkspace } from "@/components/creator-collaboration-workspace";
import { CollaborationTrustPanel } from "@/components/collaboration-trust-panel";
export const dynamic = "force-dynamic";
export default async function CreatorCollaborationPage({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user||user.role!=="CREATOR")redirect("/dashboard");
 const {id}=await params;
 const access=await prisma.collaboration.findFirst({where:{id,creatorProfile:{userId:user.id}},select:{id:true,status:true}});
 if(!access)notFound();
 return <DashboardShell title="Collaboration workspace" role="Creator"><CreatorCollaborationWorkspace id={id}/><CollaborationTrustPanel collaborationId={id} collaborationStatus={access.status} role="CREATOR"/></DashboardShell>;
}
