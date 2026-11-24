import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({
 title:z.string().trim().min(4).max(120), brief:z.string().trim().min(30).max(5000),
 coverImageUrl:z.string().url().max(2048).nullable().optional(),
 coverImagePublicId:z.string().min(1).max(240).nullable().optional(),
 objectives:z.array(z.string().trim().min(2).max(100)).max(10).default([]),
 categories:z.array(z.string().trim().min(1).max(50)).min(1).max(12),
 platforms:z.array(z.string().trim().min(1).max(30)).max(8).default([]),
 location:z.string().trim().max(100).optional().nullable(),
 budgetMin:z.number().int().min(0).optional().nullable(),budgetMax:z.number().int().min(0).optional().nullable(),
 slots:z.number().int().min(1).max(100).default(1),
 applicationDeadline:z.string().datetime().optional().nullable(),startDate:z.string().datetime().optional().nullable(),endDate:z.string().datetime().optional().nullable(),
 managementMode:z.enum(["SELF_SERVICE","MANAGED"]).default("SELF_SERVICE"),
 status:z.enum(["DRAFT","PUBLISHED"]).default("DRAFT"),
}).refine(v=>v.budgetMin==null||v.budgetMax==null||v.budgetMax>=v.budgetMin,"Maximum budget must be greater than minimum.")
.refine(v=>!v.startDate||!v.endDate||new Date(v.endDate)>=new Date(v.startDate),"Campaign end date must be after its start date.");

export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role==="CREATOR"){
  const campaigns=await prisma.campaign.findMany({where:{status:"PUBLISHED",OR:[{applicationDeadline:null},{applicationDeadline:{gte:new Date()}}]},orderBy:{createdAt:"desc"},take:50,select:{id:true,title:true,brief:true,objectives:true,categories:true,platforms:true,location:true,budgetMin:true,budgetMax:true,currency:true,slots:true,applicationDeadline:true,startDate:true,endDate:true,brand:{select:{name:true,industry:true,city:true,state:true}}}});
  return NextResponse.json({campaigns});
 }
 if(user.role!=="BRAND")return NextResponse.json({error:"Forbidden"},{status:403});
 const owner=await prisma.brandMember.findFirst({where:{userId:user.id,title:"Owner"},select:{brandId:true}});
 if(!owner)return NextResponse.json({campaigns:[]});
 const campaigns=await prisma.campaign.findMany({where:{brandId:owner.brandId},orderBy:{createdAt:"desc"},include:{_count:{select:{applications:true}}}});
 return NextResponse.json({campaigns});
}
export async function POST(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="BRAND")return NextResponse.json({error:"Brand account required."},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Invalid campaign."},{status:400});
 const owner=await prisma.brandMember.findFirst({where:{userId:user.id,title:"Owner"},select:{brandId:true}});
 if(!owner)return NextResponse.json({error:"Only the brand owner can create campaigns."},{status:403});
 const d=parsed.data;
 const { coverImagePublicId, ...campaignData } = d;
 let media = null;
 if (campaignData.coverImageUrl || coverImagePublicId) {
  if (!campaignData.coverImageUrl || !coverImagePublicId) return NextResponse.json({error:"A verified campaign cover upload is required."},{status:400});
  const url = new URL(campaignData.coverImageUrl);
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return NextResponse.json({error:"Campaign cover must be hosted on Cloudinary."},{status:400});
  media = await prisma.mediaAsset.findFirst({where:{ownerUserId:user.id,publicId:coverImagePublicId,context:"campaign-cover",resourceType:"image",secureUrl:campaignData.coverImageUrl,linkedAt:null},select:{id:true}});
  if (!media) return NextResponse.json({error:"Campaign cover upload is not verified, already attached, or not owned by this account."},{status:403});
 }
 const campaign = await prisma.$transaction(async (tx) => {
  const created = await tx.campaign.create({data:{...campaignData,brandId:owner.brandId,applicationDeadline:d.applicationDeadline?new Date(d.applicationDeadline):null,startDate:d.startDate?new Date(d.startDate):null,endDate:d.endDate?new Date(d.endDate):null}});
  if (media) {
   const linked = await tx.mediaAsset.updateMany({where:{id:media.id,ownerUserId:user.id,context:"campaign-cover",linkedAt:null},data:{linkedAt:new Date()}});
   if (linked.count !== 1) throw new Error("MEDIA_ALREADY_LINKED");
  }
  return created;
 }).catch((error) => {
  if (error instanceof Error && error.message === "MEDIA_ALREADY_LINKED") return null;
  throw error;
 });
 if (!campaign) return NextResponse.json({error:"Campaign cover upload was already attached. Upload again."},{status:409});
 return NextResponse.json({campaign},{status:201});
}