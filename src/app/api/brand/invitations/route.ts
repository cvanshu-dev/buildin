import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="BRAND")return NextResponse.json({error:"Brand account required."},{status:403});
 const owner=await prisma.brandMember.findFirst({where:{userId:user.id,title:"Owner"},select:{brandId:true}});
 if(!owner)return NextResponse.json({error:"Brand owner access required."},{status:403});
 const items=await prisma.campaignInvitation.findMany({where:{brandId:owner.brandId},orderBy:{createdAt:"desc"},include:{campaign:{select:{id:true,title:true}},creatorProfile:{select:{id:true,displayName:true,city:true,state:true}}}});
 return NextResponse.json({items});
}
export async function POST(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="BRAND")return NextResponse.json({error:"Brand account required."},{status:403});
 const owner=await prisma.brandMember.findFirst({where:{userId:user.id,title:"Owner"},select:{brandId:true}});
 if(!owner)return NextResponse.json({error:"Brand owner access required."},{status:403});
 const parsed=z.object({campaignId:z.string().min(1),creatorProfileId:z.string().min(1),note:z.string().trim().max(1000).optional(),proposedRate:z.number().int().min(0).nullable().optional()}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Invalid invitation."},{status:400});
 const [campaign,creator]=await Promise.all([
  prisma.campaign.findFirst({where:{id:parsed.data.campaignId,brandId:owner.brandId,status:"PUBLISHED"},select:{id:true,title:true,status:true}}),
  prisma.creatorProfile.findFirst({where:{id:parsed.data.creatorProfileId,isPublic:true},select:{id:true,userId:true,displayName:true}})
 ]);
 if(!campaign)return NextResponse.json({error:"Choose a published campaign owned by your brand."},{status:404});
 if(!creator)return NextResponse.json({error:"Public creator profile not found."},{status:404});
 try{
  const item=await prisma.$transaction(async tx=>{
   const invitation=await tx.campaignInvitation.create({data:{brandId:owner.brandId,campaignId:campaign.id,creatorProfileId:creator.id,invitedByUserId:user.id,note:parsed.data.note||null,proposedRate:parsed.data.proposedRate??null}});
   await tx.notification.create({data:{userId:creator.userId,type:"CAMPAIGN_INVITATION",title:"New campaign invitation",body:`You have been invited to ${campaign.title}.`,href:"/dashboard/creator/invitations"}});
   return invitation;
  });
  return NextResponse.json({item},{status:201});
 }catch(e){
  if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==="P2002")return NextResponse.json({error:"This creator has already been invited to this campaign."},{status:409});
  throw e;
 }
}