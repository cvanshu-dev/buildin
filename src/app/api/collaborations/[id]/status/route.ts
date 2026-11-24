import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
const schema = z.object({
  action: z.enum(["START", "COMPLETE", "CANCEL", "REOPEN"]),
  reason: z.string().trim().max(1000).optional(),
});
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
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
  const available = action === "START" ? item.status === "PENDING_START"
    : action === "COMPLETE" ? item.status === "ACTIVE"
    : action === "CANCEL" ? ["PENDING_START", "ACTIVE"].includes(item.status)
    : item.status === "COMPLETED";
  if (!available) return NextResponse.json({ error: "This action is not available in the current collaboration state." }, { status: 409 });
  if (action === "START" && item.agreement?.status !== "EXECUTED") return NextResponse.json({ error: "Both parties must accept the agreement before starting." }, { status: 409 });
  if (action === "COMPLETE") {
    const unfinishedDeliverables = item.deliverables.filter(d => d.status !== "APPROVED").length;
    const unfinishedMilestones = item.milestones.filter(m => m.status !== "COMPLETED").length;
    if (unfinishedDeliverables || unfinishedMilestones) return NextResponse.json({ error: "Approve all deliverables and complete all milestones first.", unfinishedDeliverables, unfinishedMilestones }, { status: 409 });
  }
  if ((action === "CANCEL" || action === "REOPEN") && !reason?.trim()) return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  const nextStatus = ({ START: "ACTIVE", COMPLETE: "COMPLETED", CANCEL: "CANCELLED", REOPEN: "ACTIVE" } as const)[action];
  const result = await prisma.$transaction(async tx => {
    const current = await tx.collaboration.findUnique({ where: { id }, select: { status: true } });
    if (!current || current.status !== item.status) throw new Error("CONFLICT");
    const update = await tx.collaboration.updateMany({ where: { id, status: item.status }, data: { status: nextStatus } });
    if (update.count !== 1) throw new Error("CONFLICT");
    const recipients = [...new Set([item.creatorProfile.userId, ...item.campaign.brand.members.map(m => m.userId)])].filter(x => x !== user.id);
    if (recipients.length) await tx.notification.createMany({ data: recipients.map(userId => ({ userId, type: `COLLABORATION_${action}`, title: `Collaboration ${action.toLowerCase()}`, body: `The collaboration for ${item.campaign.title} is now ${nextStatus.toLowerCase()}.${reason ? ` Reason: ${reason}` : ""}`, href: userId === item.creatorProfile.userId ? `/dashboard/creator/collaborations/${id}` : `/dashboard/brand/collaborations/${id}` })) });
    await tx.auditLog.create({ data: { actorId: user.id, action: `COLLABORATION_${action}`, entityType: "Collaboration", entityId: id, metadata: { previousStatus: item.status, nextStatus, reason: reason ?? null } } });
    return tx.collaboration.findUnique({ where: { id }, select: { id: true, status: true, updatedAt: true } });
  });
  return NextResponse.json({ collaboration: result });
}
