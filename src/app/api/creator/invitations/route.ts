import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="CREATOR")return NextResponse.json({error:"Creator account required."},{status:403});
 const profile=await prisma.creatorProfile.findUnique({where:{userId:user.id},select:{id:true}});
 if(!profile)return NextResponse.json({items:[]});
 const items=await prisma.campaignInvitation.findMany({where:{creatorProfileId:profile.id},orderBy:{createdAt:"desc"},include:{campaign:{select:{id:true,title:true,brief:true,budgetMin:true,budgetMax:true,applicationDeadline:true}},brand:{select:{name:true,industry:true,website:true}}}});
 return NextResponse.json({items});
}
export async function PATCH(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="CREATOR")return NextResponse.json({error:"Creator account required."},{status:403});
 const parsed=z.object({id:z.string().min(1),decision:z.enum(["ACCEPTED","DECLINED"])}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Invalid invitation response."},{status:400});
 const profile=await prisma.creatorProfile.findUnique({where:{userId:user.id},select:{id:true}});
 if(!profile)return NextResponse.json({error:"Creator profile not found."},{status:404});
 const invitation=await prisma.campaignInvitation.findFirst({where:{id:parsed.data.id,creatorProfileId:profile.id,status:"PENDING"},include:{brand:{include:{members:{where:{title:"Owner"},select:{userId:true}}}},campaign:{select:{id:true,title:true,status:true,slots:true,applicationDeadline:true}}}});
 if(!invitation)return NextResponse.json({error:"Pending invitation not found."},{status:404});
 try{
  const result=await prisma.$transaction(async tx=>{
   if(parsed.data.decision==="ACCEPTED"){
    if(invitation.campaign.status!=="PUBLISHED"||(invitation.campaign.applicationDeadline&&invitation.campaign.applicationDeadline<=new Date()))throw new Error("CAMPAIGN_CLOSED");
    const current=await tx.campaignApplication.findUnique({where:{campaignId_creatorProfileId:{campaignId:invitation.campaignId,creatorProfileId:profile.id}},select:{id:true,status:true}});
    if(current?.status==="REJECTED")throw new Error("APPLICATION_REJECTED");
    const accepted=await tx.campaignApplication.count({where:{campaignId:invitation.campaignId,status:"ACCEPTED"}});
    if(current?.status!=="ACCEPTED"&&accepted>=invitation.campaign.slots)throw new Error("CAMPAIGN_FULL");
    const application=current?await tx.campaignApplication.update({where:{id:current.id},data:{status:"ACCEPTED",...(invitation.proposedRate!==null?{proposedRate:invitation.proposedRate}:{})}}):await tx.campaignApplication.create({data:{campaignId:invitation.campaignId,creatorProfileId:profile.id,pitch:invitation.note?.trim()||"Accepted direct invitation from the brand.",proposedRate:invitation.proposedRate,status:"ACCEPTED"}});
    await tx.collaboration.upsert({where:{applicationId:application.id},create:{applicationId:application.id,campaignId:invitation.campaignId,creatorProfileId:profile.id,agreedAmount:invitation.proposedRate},update:{}});
   }
   const updated=await tx.campaignInvitation.update({where:{id:invitation.id},data:{status:parsed.data.decision}});
   for(const member of invitation.brand.members)await tx.notification.create({data:{userId:member.userId,type:"CAMPAIGN_INVITATION_RESPONSE",title:"Creator responded to invitation",body:`${user.name} ${parsed.data.decision.toLowerCase()} your invitation for ${invitation.campaign.title}.`,href:"/dashboard/brand"}});
   return updated;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  return NextResponse.json({item:result});
 }catch(e){
  if(e instanceof Error&&e.message==="CAMPAIGN_CLOSED")return NextResponse.json({error:"This campaign is no longer accepting invitations."},{status:409});
  if(e instanceof Error&&e.message==="APPLICATION_REJECTED")return NextResponse.json({error:"You previously declined this campaign application."},{status:409});
  if(e instanceof Error&&e.message==="CAMPAIGN_FULL")return NextResponse.json({error:"All creator slots have been filled."},{status:409});
  if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==="P2034")return NextResponse.json({error:"Another creator was selected at the same time. Retry."},{status:409});
  throw e;
 }
}