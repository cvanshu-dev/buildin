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
  const account = profile ? await prisma.socialAccount.findUnique({ where: { creatorProfileId_platform: { creatorProfileId: profile.id, platform: "INSTAGRAM" } } }) : null;
  if (!account?.accessTokenEncrypted || account.source !== "INSTAGRAM_OAUTH") return NextResponse.json({ error: "Instagram is not connected through Meta." }, { status: 404 });
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now() + 86_400_000) return NextResponse.json({ error: "Instagram token is expired or too close to expiry. Reconnect Instagram." }, { status: 409 });

  try {
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", decryptInstagramToken(account.accessTokenEncrypted));
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json() as { access_token?: string; expires_in?: number; error?: { message?: string } };
    if (!response.ok || !data.access_token) return NextResponse.json({ error: data.error?.message ?? "Instagram token refresh failed." }, { status: 502 });
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: { accessTokenEncrypted: encryptInstagramToken(data.access_token), tokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 5_184_000) * 1000) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Instagram token refresh failed", error);
    return NextResponse.json({ error: "Unable to refresh Instagram. Reconnect your account." }, { status: 502 });
  }
}
