import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const updateSchema=z.object({
 title:z.string().trim().min(4).max(120).optional(),brief:z.string().trim().min(30).max(5000).optional(),
 coverImageUrl:z.string().url().max(2048).nullable().optional(),
 objectives:z.array(z.string().trim().min(2).max(100)).max(10).optional(),categories:z.array(z.string().trim().min(1).max(50)).min(1).max(12).optional(),
 platforms:z.array(z.string().trim().min(1).max(30)).max(8).optional(),location:z.string().trim().max(100).nullable().optional(),
 budgetMin:z.number().int().min(0).nullable().optional(),budgetMax:z.number().int().min(0).nullable().optional(),
 slots:z.number().int().min(1).max(100).optional(),applicationDeadline:z.string().datetime().nullable().optional(),
 startDate:z.string().datetime().nullable().optional(),endDate:z.string().datetime().nullable().optional(),
 managementMode:z.enum(["SELF_SERVICE","MANAGED"]).optional(),status:z.enum(["DRAFT","PUBLISHED","PAUSED","CLOSED"]).optional()
}).refine(v=>Object.keys(v).length>0,"Provide at least one field to update.");
const transitions:Record<string,string[]>={DRAFT:["PUBLISHED"],PUBLISHED:["PAUSED","CLOSED"],PAUSED:["PUBLISHED","CLOSED"],CLOSED:[]};
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(user.role!=="BRAND")return NextResponse.json({error:"Brand account required."},{status:403});
 const {id}=await context.params;const parsed=updateSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??"Invalid update."},{status:400});
 const campaign=await prisma.campaign.findFirst({where:{id,brand:{members:{some:{userId:user.id,title:"Owner"}}}}});
 if(!campaign)return NextResponse.json({error:"Campaign not found."},{status:404});
 const d=parsed.data,nextMin=d.budgetMin!==undefined?d.budgetMin:campaign.budgetMin,nextMax=d.budgetMax!==undefined?d.budgetMax:campaign.budgetMax;
 if(nextMin!=null&&nextMax!=null&&nextMax<nextMin)return NextResponse.json({error:"Maximum budget must be greater than minimum."},{status:400});
 const start=d.startDate!==undefined?(d.startDate?new Date(d.startDate):null):campaign.startDate;
 const end=d.endDate!==undefined?(d.endDate?new Date(d.endDate):null):campaign.endDate;
 if(start&&end&&end<start)return NextResponse.json({error:"Campaign end date must be after its start date."},{status:400});
 if(d.status&&d.status!==campaign.status&&!transitions[campaign.status]?.includes(d.status))return NextResponse.json({error:"This campaign status transition is not allowed."},{status:409});
 const deadline=d.applicationDeadline!==undefined?(d.applicationDeadline?new Date(d.applicationDeadline):null):campaign.applicationDeadline;
 if(d.status==="PUBLISHED"&&deadline&&deadline<=new Date())return NextResponse.json({error:"Set a future application deadline before publishing."},{status:400});
 try{
  const updated=await prisma.$transaction(async tx=>{
   const current=await tx.campaign.findUnique({where:{id},select:{status:true,slots:true}});
   if(!current)throw new Error("NOT_FOUND");
   if(d.status&&d.status!==current.status&&!transitions[current.status]?.includes(d.status))throw new Error("STATUS_CONFLICT");
   const accepted=await tx.campaignApplication.count({where:{campaignId:id,status:"ACCEPTED"}});
   if((d.slots??current.slots)<accepted)throw new Error("SLOTS_BELOW_ACCEPTED");
   return tx.campaign.update({where:{id},data:{...d,...(d.applicationDeadline!==undefined?{applicationDeadline:deadline}:{}),...(d.startDate!==undefined?{startDate:start}:{}),...(d.endDate!==undefined?{endDate:end}:{})}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  return NextResponse.json({campaign:updated});
 }catch(e){
  if(e instanceof Error&&e.message==="SLOTS_BELOW_ACCEPTED")return NextResponse.json({error:"Slots cannot be lower than accepted creators."},{status:409});
  if(e instanceof Error&&e.message==="STATUS_CONFLICT")return NextResponse.json({error:"Campaign status changed. Refresh and try again."},{status:409});
  if(e instanceof Error&&e.message==="NOT_FOUND")return NextResponse.json({error:"Campaign not found."},{status:404});
  if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==="P2034")return NextResponse.json({error:"Campaign was updated concurrently. Retry."},{status:409});
  throw e;
 }
}