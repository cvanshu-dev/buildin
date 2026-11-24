import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptInstagramToken, encryptInstagramToken } from "@/lib/instagram-token";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const accounts = await prisma.socialAccount.findMany({
    where: {
      platform: "INSTAGRAM",
      source: "INSTAGRAM_OAUTH",
      accessTokenEncrypted: { not: null },
      tokenExpiresAt: { gt: now, lt: cutoff },
    },
    include: { creatorProfile: { select: { userId: true } } },
    take: 100,
  });

  let refreshed = 0;
  let failed = 0;
  for (const account of accounts) {
    try {
      if (!account.accessTokenEncrypted) continue;
      const url = new URL("https://graph.instagram.com/refresh_access_token");
      url.searchParams.set("grant_type", "ig_refresh_token");
      url.searchParams.set("access_token", decryptInstagramToken(account.accessTokenEncrypted));
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json() as { access_token?: string; expires_in?: number };
      if (!response.ok || !data.access_token) { failed += 1; continue; }

      const profileUrl = new URL("https://graph.instagram.com/me");
      profileUrl.searchParams.set("fields", "user_id,username,profile_picture_url,followers_count");
      profileUrl.searchParams.set("access_token", data.access_token);
      const profileResponse = await fetch(profileUrl, { cache: "no-store" });
      const profile = await profileResponse.json() as { user_id?: string; username?: string; profile_picture_url?: string; followers_count?: number };

      await prisma.$transaction([
        prisma.socialAccount.update({
          where: { id: account.id },
          data: {
            accessTokenEncrypted: encryptInstagramToken(data.access_token),
            tokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000),
            ...(profile.user_id ? { instagramUserId: String(profile.user_id) } : {}),
            ...(profile.username ? { handle: profile.username, profileUrl: `https://www.instagram.com/${profile.username}/` } : {}),
            ...(typeof profile.followers_count === "number" ? { followers: profile.followers_count } : {}),
            ...(profile.profile_picture_url ? { profilePictureUrl: profile.profile_picture_url } : {}),
          },
        }),
        ...(profileResponse.ok && profile.profile_picture_url
          ? [prisma.user.update({ where: { id: account.creatorProfile.userId }, data: { image: profile.profile_picture_url } })]
          : []),
      ]);
      refreshed += 1;
    } catch (error) {
      console.error("Scheduled Instagram refresh failed", account.id, error);
      failed += 1;
    }
  }
  return NextResponse.json({ scanned: accounts.length, refreshed, failed });
}
