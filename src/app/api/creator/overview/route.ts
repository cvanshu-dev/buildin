import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, displayName: true, isPublic: true, categories: true, specialties: true, portfolioItems: { select: { id: true } }, socialAccounts: { select: { id: true } } },
  });
  if (!profile) return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });

  const [applications, collaborations, notifications, campaignCount] = await Promise.all([
    prisma.campaignApplication.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { createdAt: "desc" }, take: 50,
      select: { id: true, pitch: true, proposedRate: true, status: true, createdAt: true, campaign: { select: { id: true, title: true, status: true, applicationDeadline: true, brand: { select: { name: true } } } } },
    }),
    prisma.collaboration.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { updatedAt: "desc" }, take: 50,
      select: { id: true, status: true, agreedAmount: true, updatedAt: true, campaign: { select: { id: true, title: true, brand: { select: { name: true } } } }, deliverables: { select: { id: true, status: true, dueAt: true } }, agreement: { select: { id: true, title: true, status: true } }, _count: { select: { messages: true } } },
    }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.campaign.count({ where: { status: "PUBLISHED", OR: [{ applicationDeadline: null }, { applicationDeadline: { gte: new Date() } }] } }),
  ]);

  const unreadNotifications = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  return NextResponse.json({ profile, applications, collaborations, notifications, unreadNotifications, campaignCount });
}
