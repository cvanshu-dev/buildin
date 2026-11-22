import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
async function ownerBrand(userId:string){return prisma.brandMember.findFirst({where:{userId,title:"Owner"},select:{brandId:true}});}
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="BRAND")return NextResponse.json({error:"Brand account required."},{status:403});
 const owner=await ownerBrand(user.id);if(!owner)return NextResponse.json({error:"Brand owner access required."},{status:403});
 const items=await prisma.brandShortlistItem.findMany({where:{brandId:owner.brandId},orderBy:{createdAt:"desc"},include:{creatorProfile:{select:{id:true,displayName:true,bio:true,city:true,state:true,categories:true,specialties:true,socialAccounts:{select:{platform:true,followers:true,handle:true}}}}}});
 return NextResponse.json({items});
}
export async function POST(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="BRAND")return NextResponse.json({error:"Brand account required."},{status:403});
 const owner=await ownerBrand(user.id);if(!owner)return NextResponse.json({error:"Brand owner access required."},{status:403});
 const parsed=z.object({creatorProfileId:z.string().min(1)}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Creator profile is required."},{status:400});
 const creator=await prisma.creatorProfile.findFirst({where:{id:parsed.data.creatorProfileId,isPublic:true},select:{id:true}});
 if(!creator)return NextResponse.json({error:"Public creator profile not found."},{status:404});
 const item=await prisma.brandShortlistItem.upsert({where:{brandId_creatorProfileId:{brandId:owner.brandId,creatorProfileId:creator.id}},create:{brandId:owner.brandId,creatorProfileId:creator.id},update:{}});
 return NextResponse.json({item},{status:201});
}
export async function DELETE(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="BRAND")return NextResponse.json({error:"Brand account required."},{status:403});
 const owner=await ownerBrand(user.id);if(!owner)return NextResponse.json({error:"Brand owner access required."},{status:403});
 const parsed=z.object({creatorProfileId:z.string().min(1)}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Creator profile is required."},{status:400});
 const result=await prisma.brandShortlistItem.deleteMany({where:{brandId:owner.brandId,creatorProfileId:parsed.data.creatorProfileId}});
 return NextResponse.json({removed:result.count});
}