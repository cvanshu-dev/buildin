import {createHash,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/current-user";
import {prisma} from "@/lib/prisma";
export const runtime="nodejs";
const schema=z.object({context:z.enum(["avatar","brand-logo","portfolio","campaign-cover","deliverable"]),collaborationId:z.string().min(1).optional()});
function sign(params:Record<string,string>,secret:string){const value=Object.keys(params).sort().map(key=>`${key}=${params[key]}`).join("&");return createHash("sha1").update(value+secret).digest("hex");}
export async function POST(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid upload request."},{status:400});
 const {context,collaborationId}=parsed.data;let folder="";
 if(context==="avatar"||context==="portfolio"){if(user.role!=="CREATOR")return NextResponse.json({error:"Creator account required."},{status:403});const p=await prisma.creatorProfile.findUnique({where:{userId:user.id},select:{id:true}});if(!p)return NextResponse.json({error:"Creator profile not found."},{status:404});folder=context==="avatar"?`buildin/creators/${user.id}/avatar`:`buildin/creators/${user.id}/portfolio`;}
 else if(context==="brand-logo"||context==="campaign-cover"){if(user.role!=="BRAND")return NextResponse.json({error:"Brand account required."},{status:403});const m=await prisma.brandMember.findFirst({where:{userId:user.id,title:"Owner"},select:{brandId:true}});if(!m)return NextResponse.json({error:"Brand owner access required."},{status:403});folder=context==="brand-logo"?`buildin/brands/${m.brandId}/logo`:`buildin/brands/${m.brandId}/campaign-covers`;}
 else {if(user.role!=="CREATOR"||!collaborationId)return NextResponse.json({error:"A creator collaboration is required."},{status:403});const c=await prisma.collaboration.findFirst({where:{id:collaborationId,status:"ACTIVE",creatorProfile:{userId:user.id}},select:{id:true}});if(!c)return NextResponse.json({error:"Active collaboration not found."},{status:404});folder=`buildin/collaborations/${c.id}/deliverables`;}
 const cloudName=process.env.CLOUDINARY_CLOUD_NAME,apiKey=process.env.CLOUDINARY_API_KEY,apiSecret=process.env.CLOUDINARY_API_SECRET;if(!cloudName||!apiKey||!apiSecret)return NextResponse.json({error:"Cloudinary is not configured. Add server credentials."},{status:503});
 const timestamp=Math.floor(Date.now()/1000),publicId=randomUUID(),allowedFormats=context==="deliverable"?"jpg,jpeg,png,webp,mp4,mov,pdf":context==="portfolio"?"jpg,jpeg,png,webp,mp4,mov":"jpg,jpeg,png,webp";const params={timestamp:String(timestamp),folder,public_id:publicId,allowed_formats:allowedFormats};
 return NextResponse.json({cloudName,apiKey,timestamp,folder,publicId,allowedFormats,signature:sign(params,apiSecret)});
}