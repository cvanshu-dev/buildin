import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { encryptInstagramToken } from "@/lib/instagram-token";

export const runtime = "nodejs";

type TokenResponse = { access_token?: string; user_id?: number | string; expires_in?: number; error_message?: string };
type InstagramProfile = { id?: string; user_id?: string; username?: string; name?: string; profile_picture_url?: string; followers_count?: number };

function returnToDashboard(request: NextRequest, status: string) {
  const url = new URL("/dashboard/creator/profile", request.url);
  url.searchParams.set("instagram", status);
  const response = NextResponse.redirect(url);
  response.cookies.delete("buildin_instagram_oauth_state");
  return response;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") return returnToDashboard(request, "unauthorized");

  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("buildin_instagram_oauth_state")?.value;
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) return returnToDashboard(request, "cancelled");
  if (!state || !expectedState || state !== expectedState || !code) return returnToDashboard(request, "invalid_state");

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) return returnToDashboard(request, "not_configured");

  try {
    const form = new FormData();
    form.set("client_id", appId);
    form.set("client_secret", appSecret);
    form.set("grant_type", "authorization_code");
    form.set("redirect_uri", redirectUri);
    form.set("code", code);
    const exchange = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form, cache: "no-store" });
    const shortToken = await exchange.json() as TokenResponse;
    if (!exchange.ok || !shortToken.access_token) throw new Error(shortToken.error_message ?? "Instagram token exchange failed.");

    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("access_token", shortToken.access_token);
    const longResponse = await fetch(longUrl, { cache: "no-store" });
    const longToken = await longResponse.json() as TokenResponse;
    if (!longResponse.ok || !longToken.access_token) throw new Error("Unable to obtain a long-lived Instagram token.");

    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "user_id,username,name,profile_picture_url,followers_count");
    profileUrl.searchParams.set("access_token", longToken.access_token);
    const profileResponse = await fetch(profileUrl, { cache: "no-store" });
    const instagram = await profileResponse.json() as InstagramProfile & { error?: { message?: string } };
    const instagramId = instagram.user_id ?? instagram.id;\n    if (!profileResponse.ok || !instagram.username || !instagramId) throw new Error(instagram.error?.message ?? "Unable to read Instagram profile.");

    const creator = await prisma.creatorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!creator) throw new Error("Creator profile not found.");
    const expiresAt = new Date(Date.now() + (longToken.expires_in ?? 5_184_000) * 1000);
    await prisma.$transaction([
      prisma.socialAccount.upsert({
        where: { creatorProfileId_platform: { creatorProfileId: creator.id, platform: "INSTAGRAM" } },
        create: {
          creatorProfileId: creator.id, platform: "INSTAGRAM", handle: instagram.username,
          profileUrl: `https://www.instagram.com/${instagram.username}/`,
          followers: typeof instagram.followers_count === "number" ? instagram.followers_count : null,
          instagramUserId: String(instagramId), accessTokenEncrypted: encryptInstagramToken(longToken.access_token),
          tokenExpiresAt: expiresAt, profilePictureUrl: instagram.profile_picture_url ?? null, source: "INSTAGRAM_OAUTH",
        },
        update: {
          handle: instagram.username, profileUrl: `https://www.instagram.com/${instagram.username}/`,
          followers: typeof instagram.followers_count === "number" ? instagram.followers_count : null,
          instagramUserId: String(instagramId), accessTokenEncrypted: encryptInstagramToken(longToken.access_token),
          tokenExpiresAt: expiresAt, profilePictureUrl: instagram.profile_picture_url ?? null, source: "INSTAGRAM_OAUTH",
        },
      }),
      ...(instagram.profile_picture_url ? [prisma.user.update({ where: { id: user.id }, data: { image: instagram.profile_picture_url } })] : []),
    ]);
    return returnToDashboard(request, "connected");
  } catch (error) {
    console.error("Instagram OAuth callback failed", error);
    return returnToDashboard(request, "failed");
  }
}
