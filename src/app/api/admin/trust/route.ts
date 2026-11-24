import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const isAdmin = (role: string) => ["ADMIN", "SUPER_ADMIN"].includes(role);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [disputes, reports, reviewStats] = await Promise.all([
    prisma.collaborationDispute.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { openedBy: { select: { id: true, name: true, email: true, role: true } }, resolver: { select: { name: true } }, collaboration: { select: { id: true, status: true, campaign: { select: { title: true, brand: { select: { name: true } } } }, creatorProfile: { select: { displayName: true, user: { select: { name: true, email: true } } } } } }, evidence: { orderBy: { createdAt: "asc" }, include: { submittedBy: { select: { name: true, role: true } } } } } }),
    prisma.reviewReport.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { reporter: { select: { name: true, email: true } }, moderator: { select: { name: true } }, review: { include: { reviewer: { select: { name: true, role: true } }, targetUser: { select: { name: true } }, targetBrand: { select: { name: true } }, collaboration: { select: { campaign: { select: { title: true } } } } } } } }),
    prisma.review.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return NextResponse.json({ disputes, reports, reviewStats: Object.fromEntries(reviewStats.map(x => [x.status, x._count._all])) });
}

const schema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("DISPUTE"), id: z.string().min(1), action: z.enum(["UNDER_REVIEW", "RESOLVE", "REJECT", "REOPEN"]), resolutionNote: z.string().trim().max(2000).optional() }),
  z.object({ entity: z.literal("REPORT"), id: z.string().min(1), action: z.enum(["DISMISS", "HIDE_REVIEW", "RESTORE_REVIEW"]) }),
]);

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Only administrators can moderate reviews and disputes." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid moderation action." }, { status: 400 });
  if (parsed.data.entity === "DISPUTE") {
    const item = await prisma.collaborationDispute.findUnique({ where: { id: parsed.data.id }, include: { collaboration: { select: { id: true, campaign: { select: { title: true, brand: { select: { members: { select: { userId: true } } } } } }, creatorProfile: { select: { userId: true } } } } });
    if (!item) return NextResponse.json({ error: "Dispute not found." }, { status: 404 });
    const allowed = parsed.data.action === "UNDER_REVIEW" ? ["OPEN"] : parsed.data.action === "RESOLVE" || parsed.data.action === "REJECT" ? ["OPEN", "UNDER_REVIEW"] : ["RESOLVED", "REJECTED"];
    if (!allowed.includes(item.status)) return NextResponse.json({ error: "This dispute action is not available in its current state." }, { status: 409 });
    if (["RESOLVE", "REJECT"].includes(parsed.data.action) && !parsed.data.resolutionNote?.trim()) return NextResponse.json({ error: "A resolution note is required." }, { status: 400 });
    const status = parsed.data.action === "UNDER_REVIEW" ? "UNDER_REVIEW" : parsed.data.action === "RESOLVE" ? "RESOLVED" : parsed.data.action === "REJECT" ? "REJECTED" : "OPEN";
    const dispute = await prisma.collaborationDispute.update({ where: { id: item.id }, data: { status, resolutionNote: parsed.data.resolutionNote?.trim() || (status === "OPEN" ? null : undefined), resolvedById: status === "RESOLVED" || status === "REJECTED" ? user.id : null, resolvedAt: status === "RESOLVED" || status === "REJECTED" ? new Date() : null } });
    const recipients = [...new Set([item.collaboration.creatorProfile.userId, ...item.collaboration.campaign.brand.members.map(m => m.userId)])];
    await prisma.$transaction([
      prisma.notification.createMany({ data: recipients.map(userId => ({ userId, type: "DISPUTE_UPDATED", title: "Dispute status updated", body: `Your dispute for ${item.collaboration.campaign.title} is now ${status.toLowerCase().replaceAll("_", " ")}.`, href: userId === item.collaboration.creatorProfile.userId ? `/dashboard/creator/collaborations/${item.collaboration.id}` : `/dashboard/brand/collaborations/${item.collaboration.id}` })) }),
      prisma.auditLog.create({ data: { actorId: user.id, action: `DISPUTE_${parsed.data.action}`, entityType: "CollaborationDispute", entityId: item.id, metadata: { previousStatus: item.status, nextStatus: status, resolutionNote: parsed.data.resolutionNote ?? null } } }),
    ]);
    return NextResponse.json({ dispute });
  }
  const report = await prisma.reviewReport.findUnique({ where: { id: parsed.data.id }, include: { review: true } });
  if (!report) return NextResponse.json({ error: "Review report not found." }, { status: 404 });
  const status = parsed.data.action === "DISMISS" ? "DISMISSED" : "ACTIONED";
  const reviewStatus = parsed.data.action === "HIDE_REVIEW" ? "HIDDEN" : parsed.data.action === "RESTORE_REVIEW" ? "PUBLISHED" : undefined;
  await prisma.$transaction([
    prisma.reviewReport.update({ where: { id: report.id }, data: { status, reviewedById: user.id, reviewedAt: new Date() } }),
    ...(reviewStatus ? [prisma.review.update({ where: { id: report.reviewId }, data: { status: reviewStatus } })] : []),
    prisma.auditLog.create({ data: { actorId: user.id, action: `REVIEW_REPORT_${parsed.data.action}`, entityType: "ReviewReport", entityId: report.id, metadata: { reviewId: report.reviewId, reviewStatus: reviewStatus ?? report.review.status } } }),
  ]);
  return NextResponse.json({ ok: true, status, reviewStatus: reviewStatus ?? report.review.status });
}
