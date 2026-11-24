import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/roles";

const submitSchema = z.object({ note: z.string().trim().max(500).optional() });
const reviewSchema = z.object({ id: z.string().min(1), decision: z.enum(["APPROVED", "REJECTED"]), reviewNote: z.string().trim().max(1000).optional() });
const canReview = (role: string) => role === "ADMIN" || role === "SUPER_ADMIN";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isStaffRole(user.role)) {
    if (!canReview(user.role)) return NextResponse.json({ error: "Verification access is restricted to Admin and Super Admin." }, { status: 403 });
    const requests = await prisma.verificationRequest.findMany({
      orderBy: { createdAt: "asc" },
      include: { applicant: { select: { id: true, name: true, email: true, role: true, creatorProfile: { select: { displayName: true, city: true, state: true, socialAccounts: { where: { platform: "INSTAGRAM" }, select: { id: true, handle: true, profileUrl: true, followers: true, source: true, socialAccountMetricSnapshots: { orderBy: { recordedAt: "desc" }, take: 1, select: { averageLikes: true, averageComments: true, averageViews: true, engagementRate: true, recordedAt: true } } } } } }, brandMemberships: { include: { brand: { select: { name: true } } } } } }, reviewer: { select: { name: true, email: true } } },
    });
    return NextResponse.json({ requests });
  }
  const item = await prisma.verificationRequest.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ item });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["BRAND", "CREATOR"].includes(user.role)) return NextResponse.json({ error: "Marketplace account required." }, { status: 403 });
  const parsed = submitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (user.role === "CREATOR") {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { socialAccounts: { where: { platform: "INSTAGRAM" }, select: { id: true }, take: 1 } },
    });
    if (!profile?.socialAccounts.length) {
      return NextResponse.json({ error: "Add your public Instagram account to your profile before requesting verification." }, { status: 400 });
    }
  }
  const existing = await prisma.verificationRequest.findFirst({ where: { userId: user.id, status: "PENDING" } });
  if (existing) return NextResponse.json({ error: "You already have a pending verification request." }, { status: 409 });
  const item = await prisma.verificationRequest.create({ data: { userId: user.id, note: parsed.data.note || null } });
  return NextResponse.json({ ok: true, item }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canReview(user.role)) return NextResponse.json({ error: "Only Admin and Super Admin can review verification requests." }, { status: 403 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
  const item = await prisma.verificationRequest.findUnique({ where: { id: parsed.data.id } });
  if (!item || item.status !== "PENDING") return NextResponse.json({ error: "Pending request not found." }, { status: 404 });
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.verificationRequest.update({ where: { id: item.id }, data: { status: parsed.data.decision, reviewNote: parsed.data.reviewNote || null, reviewedById: user.id, reviewedAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "VERIFICATION_REVIEWED", entityType: "VERIFICATION_REQUEST", entityId: item.id, metadata: { decision: parsed.data.decision } } });
    return result;
  });
  return NextResponse.json({ ok: true, item: updated });
}
