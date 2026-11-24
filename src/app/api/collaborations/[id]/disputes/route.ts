import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

async function participant(id: string, userId: string) {
  return prisma.collaboration.findFirst({ where: { id, OR: [
    { creatorProfile: { userId } }, { campaign: { brand: { members: { some: { userId } } } } },
  ] }, select: { id: true, status: true, creatorProfile: { select: { userId: true } }, campaign: { select: { title: true, brand: { select: { members: { select: { userId: true } } } } } } } });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const collaboration = await participant(id, user.id);
  if (!collaboration) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  const disputes = await prisma.collaborationDispute.findMany({ where: { collaborationId: id }, orderBy: { createdAt: "desc" }, include: { openedBy: { select: { id: true, name: true, role: true } }, resolver: { select: { name: true } }, evidence: { orderBy: { createdAt: "asc" }, include: { submittedBy: { select: { id: true, name: true } } } } } });
  return NextResponse.json({ disputes });
}

const schema = z.object({
  category: z.enum(["PAYMENT", "DELIVERABLE_QUALITY", "MISSED_DEADLINE", "SCOPE_CHANGE", "COMMUNICATION", "CONDUCT", "OTHER"]),
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(20).max(4000),
  evidence: z.array(z.object({
    kind: z.enum(["NOTE", "URL"]), label: z.string().trim().min(2).max(140),
    content: z.string().trim().max(2000).optional(), url: z.string().url().max(2048).optional(),
  })).max(10).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["BRAND", "CREATOR"].includes(user.role)) return NextResponse.json({ error: "Only collaboration participants can open a dispute." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid dispute." }, { status: 400 });
  if (parsed.data.evidence?.some(e => e.kind === "URL" && (!e.url || !e.url.startsWith("https://")))) return NextResponse.json({ error: "Evidence links must use HTTPS." }, { status: 400 });
  const { id } = await context.params;
  const collaboration = await participant(id, user.id);
  if (!collaboration) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  if (!["ACTIVE", "COMPLETED"].includes(collaboration.status)) return NextResponse.json({ error: "Disputes can only be opened for active or completed collaborations." }, { status: 409 });
  const existing = await prisma.collaborationDispute.findFirst({ where: { collaborationId: id, openedById: user.id, status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "You already have an unresolved dispute for this collaboration." }, { status: 409 });
  const dispute = await prisma.collaborationDispute.create({ data: {
    collaborationId: id, openedById: user.id, category: parsed.data.category, title: parsed.data.title, description: parsed.data.description,
    evidence: parsed.data.evidence?.length ? { create: parsed.data.evidence.map(e => ({ submittedById: user.id, kind: e.kind, label: e.label, content: e.content || null, url: e.url || null })) } : undefined,
  }, include: { openedBy: { select: { id: true, name: true, role: true } }, evidence: true } });
  const recipients = [...new Set([collaboration.creatorProfile.userId, ...collaboration.campaign.brand.members.map(m => m.userId)])].filter(x => x !== user.id);
  const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" }, select: { id: true } });
  await prisma.$transaction([
    prisma.notification.createMany({ data: recipients.map(userId => ({ userId, type: "DISPUTE_OPENED", title: "Collaboration dispute opened", body: `A dispute was opened for ${collaboration.campaign.title}.`, href: userId === collaboration.creatorProfile.userId ? `/dashboard/creator/collaborations/${id}` : `/dashboard/brand/collaborations/${id}` })) }),
    prisma.auditLog.create({ data: { actorId: user.id, action: "DISPUTE_OPENED", entityType: "CollaborationDispute", entityId: dispute.id, metadata: { collaborationId: id, category: dispute.category } } }),
    prisma.notification.createMany({ data: admins.map(admin => ({ userId: admin.id, type: "DISPUTE_OPENED", title: "New collaboration dispute", body: `A dispute was opened for ${collaboration.campaign.title}.`, href: "/dashboard/admin/trust" })) }),
  ]);
  return NextResponse.json({ dispute }, { status: 201 });
}
