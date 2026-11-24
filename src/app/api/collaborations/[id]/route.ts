import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const transitionSchema = z.object({
  action: z.enum(["START", "COMPLETE", "CANCEL", "REOPEN"]),
  reason: z.string().trim().max(1000).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const collaboration = await prisma.collaboration.findFirst({
    where: {
      id,
      OR: [
        { creatorProfile: { userId: user.id } },
        { campaign: { brand: { members: { some: { userId: user.id } } } } },
      ],
    },
    include: {
      campaign: { select: { id: true, title: true, brief: true, startDate: true, endDate: true, brand: { select: { name: true } } } },
      creatorProfile: { select: { id: true, displayName: true, userId: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 100, include: { sender: { select: { id: true, name: true } } } },
      deliverables: {
        orderBy: { createdAt: "asc" },
        include: { submissions: { orderBy: { version: "desc" }, select: { id: true, version: true, assetUrl: true, note: true, createdAt: true, attachments: { select: { id: true, fileName: true, url: true, resourceType: true, bytes: true } } } } },
      },
      milestones: { orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }] },
      agreement: {
        include: { versions: { orderBy: { version: "desc" }, select: { id: true, version: true, title: true, terms: true, status: true, createdAt: true, acceptedAt: true, brandAcceptedAt: true, brandAcceptedName: true, creatorAcceptedAt: true, creatorAcceptedName: true } } },
      },
    },
  });
  if (!collaboration) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  return NextResponse.json({ collaboration, currentUserId: user.id });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = transitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid collaboration action." }, { status: 400 });

  const item = await prisma.collaboration.findFirst({
    where: { id, OR: [{ creatorProfile: { userId: user.id } }, { campaign: { brand: { members: { some: { userId: user.id, title: "Owner" } } } } }] },
    select: {
      id: true, status: true,
      creatorProfile: { select: { userId: true } },
      campaign: { select: { title: true, brand: { select: { members: { where: { title: "Owner" }, select: { userId: true } } } } },
      deliverables: { select: { id: true, status: true } },
      agreement: { select: { status: true } },
      milestones: { select: { id: true, status: true } },
    },
  });
  if (!item) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  const isBrandOwner = item.campaign.brand.members.some(member => member.userId === user.id);
  const { action, reason } = parsed.data;
  const allowed = {
    START: isBrandOwner && item.status === "PENDING_START",
    COMPLETE: isBrandOwner && item.status === "ACTIVE",
    CANCEL: isBrandOwner && ["PENDING_START", "ACTIVE"].includes(item.status),
    REOPEN: isBrandOwner && item.status === "COMPLETED",
  } as const;
  if (!allowed[action]) return NextResponse.json({ error: "This role cannot perform that action in the current collaboration state." }, { status: 409 });
  if (action === "START" && item.agreement?.status !== "EXECUTED") return NextResponse.json({ error: "Both parties must accept the current agreement before the collaboration can start." }, { status: 409 });
  if (action === "COMPLETE") {
    const unfinishedDeliverables = item.deliverables.filter(d => d.status !== "APPROVED").length;
    const unfinishedMilestones = item.milestones.filter(m => m.status !== "COMPLETED").length;
    if (unfinishedDeliverables || unfinishedMilestones) return NextResponse.json({ error: "Approve every deliverable and complete every milestone before completing this collaboration.", unfinishedDeliverables, unfinishedMilestones }, { status: 409 });
  }
  if ((action === "CANCEL" || action === "REOPEN") && !reason?.trim()) return NextResponse.json({ error: "A reason is required." }, { status: 400 });

  const nextStatus = ({ START: "ACTIVE", COMPLETE: "COMPLETED", CANCEL: "CANCELLED", REOPEN: "ACTIVE" } as const)[action];
  try {
    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.collaboration.updateMany({ where: { id, status: item.status }, data: { status: nextStatus } });
      if (changed.count !== 1) throw new Error("STATUS_CONFLICT");
      const recipientIds = [item.creatorProfile.userId, ...item.campaign.brand.members.map(member => member.userId)];
      const recipients = [...new Set(recipientIds)].filter(userId => userId !== user.id);
      const titles = { START: "Collaboration started", COMPLETE: "Collaboration completed", CANCEL: "Collaboration cancelled", REOPEN: "Collaboration reopened" };
      const bodies = {
        START: `The brand started the collaboration for ${item.campaign.title}.`,
        COMPLETE: `The brand marked ${item.campaign.title} as completed.`,
        CANCEL: `The collaboration for ${item.campaign.title} was cancelled: ${reason}`,
        REOPEN: `The collaboration for ${item.campaign.title} was reopened: ${reason}`,
      };
      if (recipients.length) await tx.notification.createMany({ data: recipients.map(userId => ({ userId, type: `COLLABORATION_${action}`, title: titles[action], body: bodies[action], href: `/dashboard/${userId === item.creatorProfile.userId ? "creator" : "brand"}/collaborations/${id}` })) });
      await tx.auditLog.create({ data: { actorId: user.id, action: `COLLABORATION_${action}`, entityType: "Collaboration", entityId: id, metadata: { previousStatus: item.status, nextStatus, reason: reason ?? null } } });
      return tx.collaboration.findUnique({ where: { id }, select: { id: true, status: true, updatedAt: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ collaboration: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "STATUS_CONFLICT") return NextResponse.json({ error: "Collaboration status changed. Refresh and try again." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "A concurrent update occurred. Refresh and retry." }, { status: 409 });
    throw error;
  }
}
