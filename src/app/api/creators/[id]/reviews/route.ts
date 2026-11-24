import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const profile = await prisma.creatorProfile.findFirst({ where: { id, isPublic: true }, select: { id: true, displayName: true } });
  if (!profile) return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
  const creator = await prisma.creatorProfile.findUnique({ where: { id }, select: { userId: true } });
  if (!creator) return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
  const where = { targetUserId: creator.userId, status: "PUBLISHED" };
  const [reviews, aggregate] = await Promise.all([
    prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, rating: true, title: true, comment: true, createdAt: true, reviewer: { select: { name: true, role: true } }, collaboration: { select: { campaign: { select: { title: true } } } } } }),
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: { _all: true } }),
  ]);
  return NextResponse.json({ creator: profile, reviews, rating: aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(1)) : null, reviewCount: aggregate._count._all });
}
