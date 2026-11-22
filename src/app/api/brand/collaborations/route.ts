import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
  const owner = await prisma.brandMember.findFirst({ where: { userId: user.id, title: "Owner" }, select: { brandId: true } });
  if (!owner) return NextResponse.json({ error: "Brand owner access required." }, { status: 403 });
  const collaborations = await prisma.collaboration.findMany({
    where: { campaign: { brandId: owner.brandId } }, orderBy: { updatedAt: "desc" },
    include: { campaign: { select: { id: true, title: true } }, creatorProfile: { select: { id: true, displayName: true, city: true, state: true, socialAccounts: { select: { platform: true, followers: true } } } }, deliverables: { orderBy: { createdAt: "asc" } }, agreement: { select: { id: true, title: true, status: true, currentVersion: true } }, _count: { select: { messages: true } } },
  });
  return NextResponse.json({ collaborations });
}
