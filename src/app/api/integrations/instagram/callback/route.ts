import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { encryptInstagramToken } from "@/lib/instagram-token";

export const runtime = "nodejs";

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string; type?: string; code?: number };
};
type InstagramAccount = {
  id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
};
type AccountsResponse = {
  data?: InstagramAccount[];
  error?: { message?: string; type?: string; code?: number };
};

function returnToDashboard(request: NextRequest, status: string) {
  const url = new URL("/dashboard/creator", request.url);
  url.searchParams.set("instagram", status);
  const response = NextResponse.redirect(url);
  response.cookies.set("buildin_instagram_oauth_state", "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/api/integrations/instagram", maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") return returnToDashboard(request, "unauthorized");

  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("buildin_instagram_oauth_state")?.value;
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    console.error("Instagram Unified Login cancelled", request.nextUrl.searchParams.get("error_description"));
    return returnToDashboard(request, "cancelled");
  }
  if (!state || !expectedState || state !== expectedState || !code) return returnToDashboard(request, "invalid_state");

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const configId = process.env.INSTAGRAM_CONFIG_ID;
  if (!appId || !appSecret || !redirectUri || !configId) return returnToDashboard(request, "not_configured");

  try {
    // Unified Login returns a Meta access token; do not use the legacy api.instagram.com exchange.
    const tokenUrl = new URL("https://graph.facebook.com/v26.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
    const token = await tokenResponse.json() as MetaTokenResponse;
    if (!tokenResponse.ok || !token.access_token) {
      throw new Error(token.error?.message ?? "Meta authorization-code exchange failed.");
    }

    // Unified Login exposes Instagram professional accounts assigned to the authorized business integration.
    const accountsUrl = new URL("https://graph.facebook.com/v26.0/me/assigned_instagram_accounts");
    accountsUrl.searchParams.set("fields", "id,username,name,profile_picture_url,followers_count");
    accountsUrl.searchParams.set("access_token", token.access_token);
    const accountsResponse = await fetch(accountsUrl, { cache: "no-store" });
    const accountsPayload = await accountsResponse.json() as AccountsResponse;
    if (!accountsResponse.ok || !accountsPayload.data?.length) {
      throw new Error(accountsPayload.error?.message ?? "No Instagram professional account was shared with this configuration. Include the Instagram account as an asset and grant instagram_basic.");
    }

    // The configuration can share multiple assets. This integration currently stores one Instagram account per creator.
    const instagram = accountsPayload.data[0];
    if (!instagram.id || !instagram.username) {
      throw new Error("Meta did not return an Instagram account ID and username.");
    }

    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: user.id }, select: { id: true },
    });
    if (!creator) throw new Error("Creator profile not found.");

    await prisma.$transaction([
      prisma.socialAccount.upsert({
        where: { creatorProfileId_platform: { creatorProfileId: creator.id, platform: "INSTAGRAM" } },
        create: {
          creatorProfileId: creator.id,
          platform: "INSTAGRAM",
          handle: instagram.username,
          profileUrl: `https://www.instagram.com/${instagram.username}/`,
          followers: typeof instagram.followers_count === "number" ? instagram.followers_count : null,
          instagramUserId: String(instagram.id),
          accessTokenEncrypted: encryptInstagramToken(token.access_token),
          tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
          profilePictureUrl: instagram.profile_picture_url ?? null,
          source: "INSTAGRAM_UNIFIED_OAUTH",
        },
        update: {
          handle: instagram.username,
          profileUrl: `https://www.instagram.com/${instagram.username}/`,
          followers: typeof instagram.followers_count === "number" ? instagram.followers_count : null,
          instagramUserId: String(instagram.id),
          accessTokenEncrypted: encryptInstagramToken(token.access_token),
          tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
          profilePictureUrl: instagram.profile_picture_url ?? null,
          source: "INSTAGRAM_UNIFIED_OAUTH",
        },
      }),
      ...(instagram.profile_picture_url
        ? [prisma.user.update({ where: { id: user.id }, data: { image: instagram.profile_picture_url } })]
        : []),
    ]);
    return returnToDashboard(request, "connected");
  } catch (error) {
    console.error("Instagram Unified Login callback failed", error);
    return returnToDashboard(request, "failed");
  }
}
