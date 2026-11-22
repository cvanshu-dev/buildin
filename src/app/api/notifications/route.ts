import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
export async function GET(request: Request) {
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const url=new URL(request.url); const limit=Math.min(50,Math.max(1,Number(url.searchParams.get("limit"))||20));
 const cursor=url.searchParams.get("cursor")||undefined;
 const notifications=await prisma.notification.findMany({where:{userId:user.id},orderBy:[{createdAt:"desc"},{id:"desc"}],take:limit,...(cursor?{skip:1,cursor:{id:cursor}}:{})});
 return NextResponse.json({notifications,nextCursor:notifications.length===limit?notifications[notifications.length-1]?.id:null});
}
export async function PATCH(request:Request) {
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const parsed=z.object({notificationId:z.string().optional(),markAllRead:z.boolean().optional()}).refine(v=>Boolean(v.notificationId)!==(v.markAllRead===true)).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Provide notificationId or markAllRead: true."},{status:400});
 if(parsed.data.markAllRead){const r=await prisma.notification.updateMany({where:{userId:user.id,readAt:null},data:{readAt:new Date()}});return NextResponse.json({updated:r.count});}
 const r=await prisma.notification.updateMany({where:{id:parsed.data.notificationId,userId:user.id},data:{readAt:new Date()}});
 return r.count?NextResponse.json({updated:r.count}):NextResponse.json({error:"Notification not found."},{status:404});
}