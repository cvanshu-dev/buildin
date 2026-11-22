import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
export async function GET(_request:Request,context:{params:Promise<{id:string}>}) {
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {id}=await context.params;
 const d=await prisma.deliverable.findFirst({where:{id,collaboration:{OR:[{creatorProfile:{userId:user.id}},{campaign:{brand:{members:{some:{userId:user.id}}}}}]}},select:{id:true,submissions:{orderBy:{version:"desc"},select:{id:true,version:true,assetUrl:true,note:true,createdAt:true,submittedById:true}}}});
 if(!d)return NextResponse.json({error:"Deliverable not found."},{status:404});
 return NextResponse.json({submissions:d.submissions});
}