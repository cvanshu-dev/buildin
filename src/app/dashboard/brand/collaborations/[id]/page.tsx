import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { BrandCollaborationWorkspace } from "@/components/brand-collaboration-workspace";
export const dynamic="force-dynamic";
export default async function BrandCollaborationPage({params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user||user.role!=="BRAND")redirect("/dashboard");
 const {id}=await params;
 const access=await prisma.collaboration.findFirst({where:{id,campaign:{brand:{members:{some:{userId:user.id}}}}},select:{id:true}});
 if(!access)notFound();
 return <main className="min-h-screen bg-[#0b0d0e] px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl"><BrandCollaborationWorkspace id={id}/></div></main>;
}