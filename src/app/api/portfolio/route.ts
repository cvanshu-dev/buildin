import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title:z.string().trim().min(2).max(100),
  description:z.string().trim().max(500).optional(),
  mediaUrl:z.string().url().max(2048),
  mediaType:z.enum(["IMAGE","VIDEO","LINK"]).default("IMAGE"),
});
export async function POST(request:Request) {
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(user.role!=="CREATOR") return NextResponse.json({error:"Creator account required."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message ?? "Invalid item."},{status:400});
  const profile=await prisma.creatorProfile.findUnique({where:{userId:user.id},select:{id:true}});
  if(!profile) return NextResponse.json({error:"Creator profile not found."},{status:404});
  const count=await prisma.portfolioItem.count({where:{creatorProfileId:profile.id}});
  if(count>=30) return NextResponse.json({error:"Portfolio limit is 30 items."},{status:400});
  const item=await prisma.portfolioItem.create({data:{...parsed.data,description:parsed.data.description||null,creatorProfileId:profile.id,sortOrder:count}});
  return NextResponse.json({ok:true,item},{status:201});
}
export async function DELETE(request:Request) {
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(user.role!=="CREATOR") return NextResponse.json({error:"Creator account required."},{status:403});
  const id=new URL(request.url).searchParams.get("id");
  if(!id) return NextResponse.json({error:"Item id is required."},{status:400});
  const profile=await prisma.creatorProfile.findUnique({where:{userId:user.id},select:{id:true}});
  const deleted=await prisma.portfolioItem.deleteMany({where:{id,creatorProfileId:profile?.id}});
  if(!deleted.count) return NextResponse.json({error:"Item not found."},{status:404});
  return NextResponse.json({ok:true});
}
