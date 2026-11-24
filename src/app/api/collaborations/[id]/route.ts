import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

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
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
  const { id } = await context.params;
  const parsed = z.object({
    action: z.enum(["START", "COMPLETE", "CANCEL", "REOPEN"]),
    reason: z.string().trim().max(1000).optional(),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid collaboration action." }, { status: 400 });

  const item = await prisma.collaboration.findFirst({
    where: { id, campaign: { brand: { members: { some: { userId: user.id, title: "Owner" } } } } },
    select: {
      id: true, status: true, creatorProfile: { select: { userId: true } },
      campaign: { select: { title: true, brand: { select: { members: { select: { userId: true } } } } } },
      deliverables: { select: { status: true } },
      agreement: { select: { status: true } },
      milestones: { select: { status: true } },
    },
  });
  if (!item) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  const { action, reason } = parsed.data;
  const can = action === "START" ? item.status === "PENDING_START"
    : action === "COMPLETE" ? item.status === "ACTIVE"
    : action === "CANCEL" ? ["PENDING_START", "ACTIVE"].includes(item.status)
    : item.status === "COMPLETED";
  if (!can) return NextResponse.json({ error: "This action is not available in the current collaboration state." }, { status: 409 });
  if (action === "START" && item.agreement?.status !== "EXECUTED") return NextResponse.json({ error: "Both parties must accept the current agreement before starting." }, { status: 409 });
  if (action === "COMPLETE") {
    const unfinishedDeliverables = item.deliverables.filter(d => d.status !== "APPROVED").length;
    const unfinishedMilestones = item.milestones.filter(m => m.status !== "COMPLETED").length;
    if (unfinishedDeliverables || unfinishedMilestones) return NextResponse.json({ error: "Approve all deliverables and complete all milestones first.", unfinishedDeliverables, unfinishedMilestones }, { status: 409 });
  }
  if ((action === "CANCEL" || action === "REOPEN") && !reason?.trim()) return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  const nextStatus = ({ START: "ACTIVE", COMPLETE: "COMPLETED", CANCEL: "CANCELLED", REOPEN: "ACTIVE" } as const)[action];
  try {
    const result = await prisma.$transaction(async tx => {
      const update = await tx.collaboration.updateMany({ where: { id, status: item.status }, data: { status: nextStatus } });
      if (update.count !== 1) throw new Error("CONFLICT");
      const recipients = [...new Set([item.creatorProfile.userId, ...item.campaign.brand.members.map(m => m.userId)])].filter(x => x !== user.id);
      const labels = { START: ["Collaboration started", "The brand started"], COMPLETE: ["Collaboration completed", "The brand completed"], CANCEL: ["Collaboration cancelled", "The brand cancelled"], REOPEN: ["Collaboration reopened", "The brand reopened"] } as const;
      if (recipients.length) await tx.notification.createMany({ data: recipients.map(userId => ({ userId, type: `COLLABORATION_${action}`, title: labels[action][0], body: `${labels[action][1]} the collaboration for ${item.campaign.title}.${reason ? ` Reason: ${reason}` : ""}`, href: userId === item.creatorProfile.userId ? `/dashboard/creator/collaborations/${id}` : `/dashboard/brand/collaborations/${id}` })) });
      await tx.auditLog.create({ data: { actorId: user.id, action: `COLLABORATION_${action}`, entityType: "Collaboration", entityId: id, metadata: { previousStatus: item.status, nextStatus, reason: reason ?? null } } });
      return tx.collaboration.findUnique({ where: { id }, select: { id: true, status: true, updatedAt: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ collaboration: result });
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT") return NextResponse.json({ error: "Collaboration changed concurrently. Refresh and retry." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Collaboration changed concurrently. Refresh and retry." }, { status: 409 });
    throw error;
  }
}
