import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  reason: z.enum(["HARASSMENT", "FAKE_REVIEW", "CONFLICT_OF_INTEREST", "PRIVATE_INFORMATION", "SPAM", "OTHER"]),
  details: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select a valid report reason." }, { status: 400 });
  const { id } = await context.params;
  const review = await prisma.review.findUnique({ where: { id }, select: { id: true, reviewerId: true, status: true } });
  if (!review || review.status !== "PUBLISHED") return NextResponse.json({ error: "Review not found." }, { status: 404 });
  if (review.reviewerId === user.id) return NextResponse.json({ error: "You cannot report your own review." }, { status: 400 });
  try {
    const report = await prisma.reviewReport.create({ data: { reviewId: id, reporterId: user.id, reason: parsed.data.reason, details: parsed.data.details || null } });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "REVIEW_REPORTED", entityType: "ReviewReport", entityId: report.id, metadata: { reviewId: id, reason: report.reason } } });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "You have already reported this review." }, { status: 409 });
    throw error;
  }
}
