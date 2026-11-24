import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema=z.object({
  platform:z.enum(["INSTAGRAM","YOUTUBE","TIKTOK","FACEBOOK","X","LINKEDIN","TWITCH","OTHER"]),
  handle:z.string().trim().min(1).max(100),
  profileUrl:z.string().url().max(2048),
  followers:z.number().int().min(0).max(2_000_000_000).optional().nullable(),
});
export async function POST(request:Request) {
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(user.role!=="CREATOR") return NextResponse.json({error:"Creator account required."},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message ?? "Invalid social account."},{status:400});
  const profile=await prisma.creatorProfile.findUnique({where:{userId:user.id},select:{id:true}});
  if(!profile) return NextResponse.json({error:"Creator profile not found."},{status:404});
  try {
    const account=await prisma.socialAccount.upsert({
      where:{creatorProfileId_platform:{creatorProfileId:profile.id,platform:parsed.data.platform}},
      create:{...parsed.data,creatorProfileId:profile.id},
      update:{handle:parsed.data.handle,profileUrl:parsed.data.profileUrl,followers:parsed.data.followers??null},
      select:{id:true,platform:true,handle:true,profileUrl:true,followers:true,source:true,profilePictureUrl:true},
    });
    return NextResponse.json({ok:true,account},{status:201});
  } catch { return NextResponse.json({error:"Unable to save social account."},{status:400}); }
}
export async function DELETE(request:Request) {
  const user=await getCurrentUser();
  if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  if(user.role!=="CREATOR") return NextResponse.json({error:"Creator account required."},{status:403});
  const id=new URL(request.url).searchParams.get("id");
  if(!id) return NextResponse.json({error:"Account id is required."},{status:400});
  const profile=await prisma.creatorProfile.findUnique({where:{userId:user.id},select:{id:true}});
  const deleted=await prisma.socialAccount.deleteMany({where:{id,creatorProfileId:profile?.id}});
  if(!deleted.count) return NextResponse.json({error:"Account not found."},{status:404});
  return NextResponse.json({ok:true});
}
