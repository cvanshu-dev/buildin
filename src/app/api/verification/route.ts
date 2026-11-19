import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/roles";

const submitSchema=z.object({note:z.string().trim().max(500).optional()});
const reviewSchema=z.object({id:z.string().min(1),decision:z.enum(["APPROVED","REJECTED"]),reviewNote:z.string().trim().max(1000).optional()});
export async function GET() {
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(isStaffRole(user.role)) {
    const requests=await prisma.verificationRequest.findMany({
      orderBy:{createdAt:"asc"},
      include:{applicant:{select:{id:true,name:true,email:true,role:true,creatorProfile:{select:{displayName:true,city:true,state:true}},brandMemberships:{include:{brand:{select:{name:true}}}}}},reviewer:{select:{name:true,email:true}}},
    });
    return NextResponse.json({requests});
  }
  const item=await prisma.verificationRequest.findFirst({where:{userId:user.id},orderBy:{createdAt:"desc"}});
  return NextResponse.json({item});
}
export async function POST(request:Request) {
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!["BRAND","CREATOR"].includes(user.role)) return NextResponse.json({error:"Marketplace account required."},{status:403});
  const parsed=submitSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"Invalid request."},{status:400});
  const existing=await prisma.verificationRequest.findFirst({where:{userId:user.id,status:"PENDING"}});
  if(existing) return NextResponse.json({error:"You already have a pending verification request."},{status:409});
  const item=await prisma.verificationRequest.create({data:{userId:user.id,note:parsed.data.note||null}});
  return NextResponse.json({ok:true,item},{status:201});
}
export async function PATCH(request:Request) {
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!isStaffRole(user.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const parsed=reviewSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"Invalid review."},{status:400});
  const item=await prisma.verificationRequest.findUnique({where:{id:parsed.data.id}});
  if(!item || item.status!=="PENDING") return NextResponse.json({error:"Pending request not found."},{status:404});
  const updated=await prisma.verificationRequest.update({where:{id:item.id},data:{status:parsed.data.decision,reviewNote:parsed.data.reviewNote||null,reviewedById:user.id,reviewedAt:new Date()}});
  return NextResponse.json({ok:true,item:updated});
}
