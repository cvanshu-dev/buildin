import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

async function participant(id: string, userId: string) {
  return prisma.collaboration.findFirst({
    where: { id, OR: [
      { creatorProfile: { userId } },
      { campaign: { brand: { members: { some: { userId } } } } },
    ] },
    select: {
      id: true, status: true, creatorProfile: { select: { userId: true } },
      campaign: { select: { title: true, brandId: true, brand: { select: { name: true, members: { select: { userId: true } } } } } },
    },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["BRAND", "CREATOR"].includes(user.role)) return NextResponse.json({ error: "Only collaboration participants can access reviews." }, { status: 403 });
  const { id } = await context.params;
  const collaboration = await participant(id, user.id);
  if (!collaboration) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  const [reviews, ownReview] = await Promise.all([
    prisma.review.findMany({ where: { collaborationId: id, status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, include: { reviewer: { select: { id: true, name: true, image: true, role: true } }, targetUser: { select: { id: true, name: true } }, targetBrand: { select: { id: true, name: true } } } }),
    prisma.review.findFirst({ where: { collaborationId: id, reviewerRole: user.role === "BRAND" ? "BRAND" : "CREATOR" }, select: { id: true, rating: true, title: true, comment: true, status: true } }),
  ]);
  return NextResponse.json({ reviews, ownReview, canReview: collaboration.status === "COMPLETED" && !ownReview, collaborationStatus: collaboration.status });
}

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional().nullable(),
  comment: z.string().trim().min(10).max(2000),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["BRAND", "CREATOR"].includes(user.role)) return NextResponse.json({ error: "Only brand and creator accounts can leave reviews." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review." }, { status: 400 });
  const { id } = await context.params;
  const collaboration = await participant(id, user.id);
  if (!collaboration) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  if (collaboration.status !== "COMPLETED") return NextResponse.json({ error: "Reviews are available only after a collaboration is completed." }, { status: 409 });
  const reviewerRole = user.role;
  const targetUserId = reviewerRole === "BRAND" ? collaboration.creatorProfile.userId : null;
  const targetBrandId = reviewerRole === "CREATOR" ? collaboration.campaign.brandId : null;
  try {
    const review = await prisma.review.create({ data: {
      collaborationId: id, reviewerId: user.id, reviewerRole, targetUserId, targetBrandId,
      rating: parsed.data.rating, title: parsed.data.title?.trim() || null, comment: parsed.data.comment,
    }, include: { reviewer: { select: { id: true, name: true, role: true } } } });
    const recipients = reviewerRole === "BRAND" ? [collaboration.creatorProfile.userId] : collaboration.campaign.brand.members.map(m => m.userId);
    await prisma.$transaction([
      prisma.notification.createMany({ data: [...new Set(recipients)].filter(x => x !== user.id).map(userId => ({ userId, type: "REVIEW_RECEIVED", title: "New collaboration review", body: `A review was submitted for ${collaboration.campaign.title}.`, href: reviewerRole === "BRAND" ? `/dashboard/creator/collaborations/${id}` : `/dashboard/brand/collaborations/${id}` })) }),
      prisma.auditLog.create({ data: { actorId: user.id, action: "REVIEW_CREATED", entityType: "Review", entityId: review.id, metadata: { collaborationId: id, rating: review.rating, reviewerRole } } }),
    ]);
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Your side has already submitted a review for this collaboration." }, { status: 409 });
    throw error;
  }
}
