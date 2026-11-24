import { NextRequest,NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { encryptInstagramToken } from "@/lib/instagram-token";
export const runtime="nodejs";
type Token={access_token?:string;expires_in?:number;error?:{message?:string}};
type Accounts={data?:{id?:string;username?:string}[];error?:{message?:string}};
function finish(req:NextRequest,status:string){const url=new URL("/dashboard/admin",req.url);url.searchParams.set("instagram",status);const res=NextResponse.redirect(url);res.cookies.set("buildin_instagram_oauth_state","",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/api/integrations/instagram",maxAge:0});return res;}
export async function GET(req:NextRequest){
 const user=await getCurrentUser();if(!user||!["ADMIN","SUPER_ADMIN"].includes(user.role))return finish(req,"unauthorized");
 const state=req.nextUrl.searchParams.get("state"),expected=req.cookies.get("buildin_instagram_oauth_state")?.value,code=req.nextUrl.searchParams.get("code");
 if(req.nextUrl.searchParams.has("error"))return finish(req,"cancelled");if(!state||state!==expected||!code)return finish(req,"invalid_state");
 const appId=process.env.INSTAGRAM_APP_ID,secret=process.env.INSTAGRAM_APP_SECRET,redirect=process.env.INSTAGRAM_REDIRECT_URI;if(!appId||!secret||!redirect)return finish(req,"not_configured");
 try{
  const tokenUrl=new URL("https://graph.facebook.com/v26.0/oauth/access_token");tokenUrl.searchParams.set("client_id",appId);tokenUrl.searchParams.set("client_secret",secret);tokenUrl.searchParams.set("redirect_uri",redirect);tokenUrl.searchParams.set("code",code);
  const tr=await fetch(tokenUrl,{cache:"no-store"}),token=await tr.json() as Token;if(!tr.ok||!token.access_token)throw new Error(token.error?.message??"Meta token exchange failed.");
  const accountsUrl=new URL("https://graph.facebook.com/v26.0/me/assigned_instagram_accounts");accountsUrl.searchParams.set("fields","id,username");accountsUrl.searchParams.set("access_token",token.access_token);
  const ar=await fetch(accountsUrl,{cache:"no-store"}),accounts=await ar.json() as Accounts,account=accounts.data?.[0];if(!ar.ok||!account?.id||!account.username)throw new Error(accounts.error?.message??"No Instagram professional account was assigned to this Meta configuration.");
  await prisma.platformInstagramConnection.upsert({where:{id:"primary"},create:{id:"primary",instagramUserId:account.id,username:account.username,accessTokenEncrypted:encryptInstagramToken(token.access_token),tokenExpiresAt:token.expires_in?new Date(Date.now()+token.expires_in*1000):null,connectedById:user.id},update:{instagramUserId:account.id,username:account.username,accessTokenEncrypted:encryptInstagramToken(token.access_token),tokenExpiresAt:token.expires_in?new Date(Date.now()+token.expires_in*1000):null,connectedById:user.id}});
  return finish(req,"connected");
 }catch(e){console.error("Buildin Instagram connection failed",e);return finish(req,"failed");}
}