import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
  const { id } = await context.params;
  const membership = await prisma.brandMember.findFirst({ where: { brandId: id, userId: user.id }, select: { id: true } });
  if (!membership) return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  const where = { targetBrandId: id, status: "PUBLISHED" };
  const [reviews, summary] = await Promise.all([
    prisma.review.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, rating: true, title: true, comment: true, createdAt: true, reviewer: { select: { name: true, role: true } }, collaboration: { select: { campaign: { select: { title: true } } } } } }),
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: { _all: true } }),
  ]);
  return NextResponse.json({ reviews, rating: summary._avg.rating ? Number(summary._avg.rating.toFixed(1)) : null, reviewCount: summary._count._all });
}
