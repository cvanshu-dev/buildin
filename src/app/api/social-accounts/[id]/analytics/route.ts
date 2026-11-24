import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { refreshInstagramAnalytics } from "@/lib/instagram-analytics";

export const maxDuration = 300;
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const account = await prisma.socialAccount.findUnique({
    where: { id },
    include: { creatorProfile: { select: { userId: true, isPublic: true } }, socialAccountMetricSnapshots: { orderBy: { recordedAt: "desc" }, take: 1 } },
  });
  if (!account) return NextResponse.json({ error: "Social account not found." }, { status: 404 });
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
  const isOwner = account.creatorProfile.userId === user.id;
  const isBrand = user.role === "BRAND" && account.creatorProfile.isPublic;
  if (!isAdmin && !isOwner && !isBrand) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ account: { id: account.id, handle: account.handle, followers: account.followers, following: account.following, latestSnapshot: account.socialAccountMetricSnapshots[0] ?? null } });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const account = await prisma.socialAccount.findUnique({ where: { id }, include: { creatorProfile: { select: { userId: true } } } });
  if (!account) return NextResponse.json({ error: "Social account not found." }, { status: 404 });
  if (account.creatorProfile.userId !== user.id && !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (account.platform !== "INSTAGRAM") return NextResponse.json({ error: "Only Instagram accounts can be analyzed." }, { status: 400 });
  try {
    const snapshot = await refreshInstagramAnalytics(id);
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Instagram analysis failed." }, { status: 502 });
  }
}
