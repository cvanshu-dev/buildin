import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN"].includes(actor.role)) {
    return NextResponse.json({ error: "Only administrators can view account details." }, { status: 403 });
  }

  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      status: true,
      onboardingDone: true,
      createdAt: true,
      updatedAt: true,
      creatorProfile: {
        select: {
          id: true,
          displayName: true,
          bio: true,
          city: true,
          state: true,
          categories: true,
          specialties: true,
          languages: true,
          isPublic: true,
          socialAccounts: {
            select: { platform: true, handle: true, profileUrl: true, followers: true, source: true },
          },
          portfolioItems: {
            orderBy: { sortOrder: "asc" },
            take: 8,
            select: { id: true, title: true, description: true, mediaUrl: true, mediaType: true },
          },
          _count: { select: { applications: true, collaborations: true, portfolioItems: true } },
        },
      },
      brandMemberships: {
        select: {
          title: true,
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
              website: true,
              industry: true,
              city: true,
              state: true,
              _count: { select: { campaigns: true, members: true } },
            },
          },
        },
      },
      verificationRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          note: true,
          reviewNote: true,
          createdAt: true,
          reviewedAt: true,
          reviewer: { select: { name: true, email: true } },
        },
      },
      _count: {
        select: {
          authoredReviews: true,
          receivedReviews: true,
          openedDisputes: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const [recentAudit, recentReviews] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityType: "USER", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.review.findMany({
      where: { OR: [{ reviewerId: id }, { targetUserId: id }] },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        status: true,
        createdAt: true,
        reviewer: { select: { name: true } },
        targetUser: { select: { name: true } },
        collaboration: { select: { campaign: { select: { title: true } } } },
      },
    }),
  ]);

  return NextResponse.json({ user, recentAudit, recentReviews });
}
