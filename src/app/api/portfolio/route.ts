import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title:z.string().trim().min(2).max(100),
  description:z.string().trim().max(500).optional(),
  mediaUrl:z.string().url().max(2048),
  mediaType:z.enum(["IMAGE","VIDEO","LINK"]).default("IMAGE"),
  publicId:z.string().min(1).max(240).optional(),
  resourceType:z.enum(["image","video","raw"]).optional(),
});
export async function POST(request:Request) {
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(user.role!=="CREATOR") return NextResponse.json({error:"Creator account required."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message ?? "Invalid item."},{status:400});
  const profile=await prisma.creatorProfile.findUnique({where:{userId:user.id},select:{id:true}});
  if(!profile) return NextResponse.json({error:"Creator profile not found."},{status:404});
  if (parsed.data.publicId) { const mediaUrl = new URL(parsed.data.mediaUrl); if (mediaUrl.protocol !== "https:" || mediaUrl.hostname !== "res.cloudinary.com" || !parsed.data.publicId.startsWith(`buildin/creators/${user.id}/portfolio/`) || !parsed.data.resourceType) return NextResponse.json({error:"Uploaded portfolio media must belong to your creator folder."},{status:400}); }
  const count=await prisma.portfolioItem.count({where:{creatorProfileId:profile.id}});
  if(count>=30) return NextResponse.json({error:"Portfolio limit is 30 items."},{status:400});
  const item=await prisma.portfolioItem.create({data:{...parsed.data,description:parsed.data.description||null,creatorProfileId:profile.id,sortOrder:count}});
  if (parsed.data.publicId) await prisma.mediaAsset.updateMany({ where: { ownerUserId: user.id, publicId: parsed.data.publicId }, data: { linkedAt: new Date() } });
  return NextResponse.json({ok:true,item},{status:201});
}
export async function DELETE(request:Request) {
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(user.role!=="CREATOR") return NextResponse.json({error:"Creator account required."},{status:403});
  const id=new URL(request.url).searchParams.get("id");
  if(!id) return NextResponse.json({error:"Item id is required."},{status:400});
  const profile=await prisma.creatorProfile.findUnique({where:{userId:user.id},select:{id:true}});
  const item=await prisma.portfolioItem.findFirst({where:{id,creatorProfileId:profile?.id}});
  if(!item) return NextResponse.json({error:"Item not found."},{status:404});
  if(item.publicId && item.resourceType){
    const cloud=process.env.CLOUDINARY_CLOUD_NAME,key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;
    if(!cloud||!key||!secret)return NextResponse.json({error:"Cloudinary is not configured."},{status:503});
    const timestamp=String(Math.floor(Date.now()/1000)),params={public_id:item.publicId,timestamp};
    const signature=createHash("sha1").update(Object.keys(params).sort().map(name=>`${name}=${params[name as keyof typeof params]}`).join("&")+secret).digest("hex");
    const form=new FormData();form.set("public_id",item.publicId);form.set("timestamp",timestamp);form.set("api_key",key);form.set("signature",signature);
    const response=await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${item.resourceType}/destroy`,{method:"POST",body:form,cache:"no-store"});
    const result=await response.json() as {result?:string;error?:{message?:string}};
    if(!response.ok||!["ok","not found"].includes(result.result??""))return NextResponse.json({error:result.error?.message??"Cloudinary deletion failed."},{status:502});
  }
  await prisma.portfolioItem.delete({where:{id:item.id}});
  if (item.publicId) await prisma.mediaAsset.deleteMany({ where: { ownerUserId: user.id, publicId: item.publicId } });
  return NextResponse.json({ok:true});
}
