import { NextResponse } from "next/server";
import { z } from "zod";
const schema=z.object({name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254),topic:z.string().trim().max(80),message:z.string().trim().min(10).max(4000)});
export async function POST(request:Request){
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Please check the form and try again."},{status:400});
 const key=process.env.RESEND_API_KEY;const from=process.env.RESEND_FROM_EMAIL;const to=process.env.CONTACT_EMAIL;
 if(!key||!from||!to)return NextResponse.json({error:"Contact email is not configured yet. Please try again later."},{status:503});
 const {name,email,topic,message}=parsed.data;
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[to],reply_to:email,subject:`Website enquiry: ${topic}`,text:`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`})});
 if(!response.ok){console.error("Contact email provider returned",response.status);return NextResponse.json({error:"We couldn't send your message. Please try again later."},{status:502});}
 return NextResponse.json({ok:true});
}