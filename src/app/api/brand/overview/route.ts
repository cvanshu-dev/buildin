import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
  const owner = await prisma.brandMember.findFirst({ where: { userId: user.id, title: "Owner" }, select: { brandId: true } });
  if (!owner) return NextResponse.json({ error: "Brand owner access required." }, { status: 403 });
  const brandId = owner.brandId;
  const [campaigns, applications, collaborations, unread, spend] = await Promise.all([
    prisma.campaign.groupBy({ by: ["status"], where: { brandId }, _count: { _all: true } }),
    prisma.campaignApplication.count({ where: { campaign: { brandId } } }),
    prisma.collaboration.findMany({ where: { campaign: { brandId } }, select: { id: true, status: true, agreedAmount: true, createdAt: true, campaign: { select: { title: true } }, creatorProfile: { select: { displayName: true } }, deliverables: { select: { id: true, status: true, dueAt: true } } }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.collaboration.aggregate({ where: { campaign: { brandId } }, _sum: { agreedAmount: true } }),
  ]);
  const campaignCounts = Object.fromEntries(campaigns.map(x => [x.status.toLowerCase(), x._count._all]));
  const pendingApplications = await prisma.campaignApplication.count({ where: { campaign: { brandId }, status: { in: ["SUBMITTED", "SHORTLISTED"] } } });
  return NextResponse.json({ campaignCounts, totalApplications: applications, pendingApplications, collaborations, unreadNotifications: unread, committedBudget: spend._sum.agreedAmount ?? 0 });
}
