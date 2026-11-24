import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { DashboardShell } from "@/components/dashboard-shell";
import { CreatorCollaborationWorkspace } from "@/components/creator-collaboration-workspace";
export default async function CreatorCollaborationPage({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user||user.role!=="CREATOR")redirect("/dashboard");
 const {id}=await params;
 return <DashboardShell title="Collaboration workspace" role="Creator"><CreatorCollaborationWorkspace id={id}/></DashboardShell>;
}
