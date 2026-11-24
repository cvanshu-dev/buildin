import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { decryptInstagramToken, encryptInstagramToken } from "@/lib/instagram-token";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });

  const profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  const account = profile ? await prisma.socialAccount.findUnique({
    where: { creatorProfileId_platform: { creatorProfileId: profile.id, platform: "INSTAGRAM" } },
  }) : null;
  if (!account?.accessTokenEncrypted || account.source !== "INSTAGRAM_OAUTH") {
    return NextResponse.json({ error: "Instagram is not connected through Meta." }, { status: 404 });
  }
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Instagram token has expired. Reconnect Instagram." }, { status: 409 });
  }

  try {
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", decryptInstagramToken(account.accessTokenEncrypted));
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json() as { access_token?: string; expires_in?: number; error?: { message?: string } };
    if (!response.ok || !data.access_token) {
      return NextResponse.json({ error: data.error?.message ?? "Instagram token refresh failed." }, { status: 502 });
    }

    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "user_id,username,profile_picture_url,followers_count");
    profileUrl.searchParams.set("access_token", data.access_token);
    const profileResponse = await fetch(profileUrl, { cache: "no-store" });
    const profileData = await profileResponse.json() as {
      user_id?: string; username?: string; profile_picture_url?: string; followers_count?: number;
    };

    await prisma.$transaction([
      prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEncrypted: encryptInstagramToken(data.access_token),
          tokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000),
          ...(profileData.user_id ? { instagramUserId: String(profileData.user_id) } : {}),
          ...(profileData.username ? { handle: profileData.username, profileUrl: `https://www.instagram.com/${profileData.username}/` } : {}),
          ...(typeof profileData.followers_count === "number" ? { followers: profileData.followers_count } : {}),
          ...(profileData.profile_picture_url ? { profilePictureUrl: profileData.profile_picture_url } : {}),
        },
      }),
      ...(profileResponse.ok && profileData.profile_picture_url
        ? [prisma.user.update({ where: { id: user.id }, data: { image: profileData.profile_picture_url } })]
        : []),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Instagram token refresh failed", error);
    return NextResponse.json({ error: "Unable to refresh Instagram. Reconnect your account." }, { status: 502 });
  }
}
