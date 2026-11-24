import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().max(1000).optional().nullable(), dueAt: z.string().datetime().optional().nullable() });
const updateSchema = z.object({ milestoneId: z.string().min(1), action: z.enum(["COMPLETE", "REOPEN", "UPDATE"]), title: z.string().trim().min(2).max(120).optional(), description: z.string().trim().max(1000).optional().nullable(), dueAt: z.string().datetime().optional().nullable() });
async function getAccess(id: string, userId: string) {
  return prisma.collaboration.findFirst({
    where: { id, OR: [{ creatorProfile: { userId } }, { campaign: { brand: { members: { some: { userId } } } }] },
    select: { id: true, status: true, creatorProfile: { select: { userId: true } }, campaign: { select: { brand: { select: { members: { where: { title: "Owner" }, select: { userId: true } } } } } } },
  });
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid milestone." }, { status: 400 });
  const collab = await getAccess(id, user.id);
  if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  const isBrand = collab.campaign.brand.members.some(member => member.userId === user.id);
  if (!isBrand) return NextResponse.json({ error: "Only brand members can create milestones." }, { status: 403 });
  if (!["PENDING_START", "ACTIVE"].includes(collab.status)) return NextResponse.json({ error: "Milestones cannot be added to a closed collaboration." }, { status: 409 });
  const milestone = await prisma.collaborationMilestone.create({ data: { collaborationId: id, title: parsed.data.title, description: parsed.data.description ?? null, dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null, createdById: user.id } });
  await prisma.notification.create({ data: { userId: collab.creatorProfile.userId, type: "MILESTONE_CREATED", title: "New collaboration milestone", body: `The brand added "${milestone.title}".`, href: `/dashboard/creator/collaborations/${id}` } });
  return NextResponse.json({ milestone }, { status: 201 });
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid milestone update." }, { status: 400 });
  const collab = await getAccess(id, user.id);
  if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  if (!["PENDING_START", "ACTIVE"].includes(collab.status)) return NextResponse.json({ error: "Milestones on a closed collaboration cannot be changed." }, { status: 409 });
  const isBrand = collab.campaign.brand.members.some(member => member.userId === user.id);
  const milestone = await prisma.collaborationMilestone.findFirst({ where: { id: parsed.data.milestoneId, collaborationId: id } });
  if (!milestone) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
  if (parsed.data.action === "UPDATE") {
    if (!isBrand) return NextResponse.json({ error: "Only the brand can edit milestone details." }, { status: 403 });
    const updated = await prisma.collaborationMilestone.update({ where: { id: milestone.id }, data: { title: parsed.data.title ?? milestone.title, description: parsed.data.description === undefined ? milestone.description : parsed.data.description, dueAt: parsed.data.dueAt === undefined ? milestone.dueAt : parsed.data.dueAt ? new Date(parsed.data.dueAt) : null } });
    return NextResponse.json({ milestone: updated });
  }
  if (parsed.data.action === "COMPLETE" && collab.creatorProfile.userId !== user.id) return NextResponse.json({ error: "Only the assigned creator can mark a milestone complete." }, { status: 403 });
  if (parsed.data.action === "REOPEN" && !isBrand) return NextResponse.json({ error: "Only the brand can reopen a milestone." }, { status: 403 });
  const nextStatus = parsed.data.action === "COMPLETE" ? "COMPLETED" : "IN_PROGRESS";
  try {
    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.collaborationMilestone.updateMany({ where: { id: milestone.id, status: milestone.status }, data: { status: nextStatus, completedAt: nextStatus === "COMPLETED" ? new Date() : null, completedById: nextStatus === "COMPLETED" ? user.id : null } });
      if (changed.count !== 1) throw new Error("MILESTONE_CONFLICT");
      const recipients = isBrand ? [collab.creatorProfile.userId] : collab.campaign.brand.members.filter(member => member.userId !== user.id).map(member => member.userId);
      if (recipients.length) await tx.notification.createMany({ data: recipients.map(userId => ({ userId, type: "MILESTONE_UPDATED", title: "Milestone updated", body: `The milestone "${milestone.title}" was updated to ${nextStatus.toLowerCase().replace("_", " ")}.`, href: `/dashboard/${isBrand ? "creator" : "brand"}/collaborations/${id}` })) });
      await tx.auditLog.create({ data: { actorId: user.id, action: `MILESTONE_${parsed.data.action}`, entityType: "CollaborationMilestone", entityId: milestone.id, metadata: { collaborationId: id, previousStatus: milestone.status, nextStatus } } });
      return tx.collaborationMilestone.findUnique({ where: { id: milestone.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ milestone: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "MILESTONE_CONFLICT") return NextResponse.json({ error: "Milestone was changed concurrently. Refresh and retry." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "A concurrent update occurred. Refresh and retry." }, { status: 409 });
    throw error;
  }
}
