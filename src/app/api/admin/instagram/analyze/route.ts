import {NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/current-user";
import {prisma} from "@/lib/prisma";
import {decryptInstagramToken} from "@/lib/instagram-token";
export const runtime="nodejs";
const input=z.object({socialAccountId:z.string().min(1)});
type Media={id:string;media_type?:string;like_count?:number;comments_count?:number;timestamp?:string;permalink?:string;caption?:string};
type Payload={business_discovery?:{username?:string;followers_count?:number;follows_count?:number;media_count?:number;media?:{data?:Media[]}};error?:{message?:string}};
export async function POST(req:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});if(!["ADMIN","SUPER_ADMIN"].includes(user.role))return NextResponse.json({error:"Admin access required."},{status:403});
 const parsed=input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Instagram account is required."},{status:400});
 const [connection,social]=await Promise.all([prisma.platformInstagramConnection.findUnique({where:{id:"primary"}}),prisma.socialAccount.findUnique({where:{id:parsed.data.socialAccountId}})]);
 if(!social||social.platform!=="INSTAGRAM")return NextResponse.json({error:"Instagram account not found."},{status:404});if(!connection)return NextResponse.json({error:"Connect Buildin's Instagram account in Admin Dashboard first."},{status:409});
 if(connection.tokenExpiresAt&&connection.tokenExpiresAt.getTime()<Date.now())return NextResponse.json({error:"Buildin's Meta token expired. Reconnect it in Admin Dashboard."},{status:409});
 const username=social.handle.replace(/^@/,"").trim();if(!/^[a-zA-Z0-9._]{1,30}$/.test(username))return NextResponse.json({error:"Invalid Instagram username."},{status:400});
 try{
  const url=new URL("https://graph.facebook.com/v26.0/"+connection.instagramUserId);url.searchParams.set("fields",`business_discovery.username(${username}){username,followers_count,follows_count,media_count,media.limit(12){id,media_type,like_count,comments_count,timestamp,permalink,caption}}`);url.searchParams.set("access_token",decryptInstagramToken(connection.accessTokenEncrypted));
  const response=await fetch(url,{cache:"no-store"}),payload=await response.json() as Payload,profile=payload.business_discovery;
  if(!response.ok||!profile)return NextResponse.json({error:payload.error?.message??"Meta Business Discovery cannot access this username. The target must be a supported public professional account."},{status:422});
  const media=profile.media?.data??[],valid=media.filter(x=>typeof x.like_count==="number"||typeof x.comments_count==="number");
  const avgLikes=valid.length?Math.round(valid.reduce((s,x)=>s+(x.like_count??0),0)/valid.length):null,avgComments=valid.length?Math.round(valid.reduce((s,x)=>s+(x.comments_count??0),0)/valid.length):null;
  const followers=profile.followers_count??null,er=followers&&valid.length?Number(((valid.reduce((s,x)=>s+(x.like_count??0)+(x.comments_count??0),0)/valid.length/followers)*100).toFixed(2)):null;
  await prisma.$transaction(async tx=>{await tx.socialAccount.update({where:{id:social.id},data:{handle:profile.username??username,profileUrl:"https://www.instagram.com/"+(profile.username??username)+"/",followers,source:"META_BUSINESS_DISCOVERY"}});await tx.socialAccountMetricSnapshot.create({data:{socialAccountId:social.id,followers:followers??0,averageLikes:avgLikes,averageComments:avgComments,engagementRate:er,source:"META_BUSINESS_DISCOVERY"}});});
  return NextResponse.json({ok:true,username:profile.username??username,followers,following:profile.follows_count??null,mediaCount:profile.media_count??null,averageLikes:avgLikes,averageComments:avgComments,engagementRate:er,posts:media.map(x=>({id:x.id,type:x.media_type??null,likes:x.like_count??null,comments:x.comments_count??null,views:null,timestamp:x.timestamp??null,permalink:x.permalink??null,caption:x.caption?.slice(0,160)??null})),note:"Meta Business Discovery does not provide third-party video view counts through this query. Views are not estimated or fabricated."});
 }catch(e){console.error("Instagram Business Discovery failed",e);return NextResponse.json({error:"Unable to analyse this Instagram account."},{status:502});}
}