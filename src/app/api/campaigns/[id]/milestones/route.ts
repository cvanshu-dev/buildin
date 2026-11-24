import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {id}=await context.params;
 const collaboration=await prisma.collaboration.findFirst({
  where:{id,OR:[{creatorProfile:{userId:user.id}},{campaign:{brand:{members:{some:{userId:user.id}}}}}]},
  select:{id:true,milestones:{orderBy:[{dueAt:"asc"},{createdAt:"asc"}]}}
 });
 if(!collaboration)return NextResponse.json({error:"Collaboration not found."},{status:404});
 return NextResponse.json({milestones:collaboration.milestones});
}
