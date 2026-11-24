import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
export const runtime = "nodejs";
export async function GET() {
 const user=await getCurrentUser();
 if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!["ADMIN","SUPER_ADMIN"].includes(user.role)) return NextResponse.json({error:"Only administrators can connect Buildin's Instagram account."},{status:403});
 const appId=process.env.INSTAGRAM_APP_ID, redirectUri=process.env.INSTAGRAM_REDIRECT_URI, configId=process.env.INSTAGRAM_CONFIG_ID;
 if(!appId||!redirectUri||!configId) return NextResponse.json({error:"Configure INSTAGRAM_APP_ID, INSTAGRAM_REDIRECT_URI and INSTAGRAM_CONFIG_ID."},{status:503});
 const state=randomBytes(32).toString("hex"), url=new URL("https://www.facebook.com/dialog/oauth");
 url.searchParams.set("client_id",appId); url.searchParams.set("config_id",configId); url.searchParams.set("redirect_uri",redirectUri); url.searchParams.set("response_type","code"); url.searchParams.set("state",state); url.searchParams.set("override_default_response_type","true");
 const response=NextResponse.redirect(url);
 response.cookies.set("buildin_instagram_oauth_state",state,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/api/integrations/instagram",maxAge:600});
 return response;
}