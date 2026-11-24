import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  dueAt: z.string().datetime().nullable().optional(),
});
const actionSchema = z.object({
  action: z.enum(["START", "SUBMIT", "APPROVE", "REQUEST_CHANGES", "PAUSE", "RESUME", "REQUEST_COMPLETION", "COMPLETE", "CANCEL"]),
  milestoneId: z.string().optional(),
  feedback: z.string().trim().max(1000).optional(),
  message: z.string().trim().max(1000).optional(),
});

async function participant(id: string, userId: string) {
  return prisma.collaboration.findFirst({
    where: { id, OR: [
      { creatorProfile: { userId } },
      { campaign: { brand: { members: { some: { userId } } } } },
    ] },
    select: {
      id: true, status: true, creatorProfile: { select: { userId: true } },
      campaign: { select: { title: true, brand: { select: { members: { select: { userId: true } } } } } },
    },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const collab = await participant(id, user.id);
  if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  const [milestones, events] = await Promise.all([
    prisma.collaborationMilestone.findMany({ where: { collaborationId: id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.collaborationEvent.findMany({ where: { collaborationId: id }, orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  return NextResponse.json({ status: collab.status, milestones, events });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid milestone." }, { status: 400 });
  const collab = await participant(id, user.id);
  if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  if (collab.creatorProfile.userId === user.id) return NextResponse.json({ error: "Only the brand can add milestones." }, { status: 403 });
  if (collab.status !== "ACTIVE") return NextResponse.json({ error: "Milestones cannot be added while the collaboration is inactive." }, { status: 409 });
  const count = await prisma.collaborationMilestone.count({ where: { collaborationId: id } });
  if (count >= 20) return NextResponse.json({ error: "A collaboration can have at most 20 milestones." }, { status: 409 });
  const milestone = await prisma.$transaction(async tx => {
    const item = await tx.collaborationMilestone.create({ data: {
      collaborationId: id, title: parsed.data.title, description: parsed.data.description,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null, sortOrder: count, createdById: user.id,
    }});
    await tx.collaborationEvent.create({ data: { collaborationId: id, actorId: user.id, action: "MILESTONE_CREATED", message: item.title } });
    await tx.notification.create({ data: {
      userId: collab.creatorProfile.userId, type: "MILESTONE_CREATED", title: "New campaign milestone",
      body: `The brand added "${item.title}" to ${collab.campaign.title}.`,
      href: `/dashboard/creator/collaborations/${id}`,
    }});
    return item;
  });
  return NextResponse.json({ milestone }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid action." }, { status: 400 });
  const collab = await participant(id, user.id);
  if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  const isCreator = collab.creatorProfile.userId === user.id;
  const { action, milestoneId, feedback, message } = parsed.data;
  const brandRecipients = [...new Set(collab.campaign.brand.members.map(m => m.userId))].filter(id => id !== user.id);
  const notify = async (tx: Prisma.TransactionClient, recipients: string[], type: string, title: string, body: string) => {
    if (recipients.length) await tx.notification.createMany({ data: recipients.map(userId => ({ userId, type, title, body, href: isCreator ? `/dashboard/brand/collaborations/${id}` : `/dashboard/creator/collaborations/${id}` })) });
  };

  try {
    const result = await prisma.$transaction(async tx => {
      if (["PAUSE", "RESUME", "REQUEST_COMPLETION", "COMPLETE", "CANCEL"].includes(action)) {
        const allowed: Record<string, string[]> = {
          PAUSE: ["ACTIVE"], RESUME: ["ON_HOLD"], REQUEST_COMPLETION: ["ACTIVE"],
          COMPLETE: ["ACTIVE"], CANCEL: ["ACTIVE", "ON_HOLD"],
        };
        if (action === "REQUEST_COMPLETION") {
          if (!isCreator) throw new Error("CREATOR_ONLY");
          await tx.collaborationEvent.create({ data: { collaborationId: id, actorId: user.id, action, message: message ?? null } });
          await notify(tx, brandRecipients, "COMPLETION_REQUESTED", "Completion requested", `${user.name} requested completion of ${collab.campaign.title}.`);
          return { requested: true };
        }
        if (isCreator && action !== "CANCEL") throw new Error("BRAND_ONLY");
        if (!allowed[action].includes(collab.status)) throw new Error("INVALID_TRANSITION");
        if (action === "COMPLETE") {
          const [agreement, deliverables, milestones] = await Promise.all([
            tx.collaborationAgreement.findUnique({ where: { collaborationId: id }, select: { status: true } }),
            tx.deliverable.count({ where: { collaborationId: id, status: { not: "APPROVED" } } }),
            tx.collaborationMilestone.count({ where: { collaborationId: id, status: { not: "APPROVED" } } }),
          ]);
          if (agreement?.status !== "EXECUTED") throw new Error("AGREEMENT_REQUIRED");
          if (deliverables > 0 || milestones > 0) throw new Error("WORK_REMAINS");
        }
        const nextStatus = action === "PAUSE" ? "ON_HOLD" : action === "RESUME" ? "ACTIVE" : action === "CANCEL" ? "CANCELLED" : "COMPLETED";
        const changed = await tx.collaboration.updateMany({ where: { id, status: collab.status }, data: { status: nextStatus } });
        if (changed.count !== 1) throw new Error("STATUS_CONFLICT");
        await tx.collaborationEvent.create({ data: { collaborationId: id, actorId: user.id, action, message: message ?? null, metadata: { from: collab.status, to: nextStatus } } });
        const recipients = isCreator ? brandRecipients : [collab.creatorProfile.userId];
        await notify(tx, recipients, `COLLABORATION_${nextStatus}`, `Collaboration ${nextStatus.toLowerCase().replace("_", " ")}`, `${collab.campaign.title} is now ${nextStatus.toLowerCase().replace("_", " ")}.`);
        return { status: nextStatus };
      }

      if (!milestoneId) throw new Error("MILESTONE_REQUIRED");
      const milestone = await tx.collaborationMilestone.findFirst({ where: { id: milestoneId, collaborationId: id } });
      if (!milestone) throw new Error("MILESTONE_NOT_FOUND");
      if (collab.status !== "ACTIVE") throw new Error("COLLAB_INACTIVE");
      const transitions: Record<string, string[]> = {
        START: ["PENDING"], SUBMIT: ["IN_PROGRESS", "CHANGES_REQUESTED"],
        APPROVE: ["SUBMITTED"], REQUEST_CHANGES: ["SUBMITTED"],
      };
      if (action === "START" && !isCreator) throw new Error("CREATOR_ONLY");
      if (action === "SUBMIT" && !isCreator) throw new Error("CREATOR_ONLY");
      if ((action === "APPROVE" || action === "REQUEST_CHANGES") && isCreator) throw new Error("BRAND_ONLY");
      if (!transitions[action]?.includes(milestone.status)) throw new Error("INVALID_MILESTONE_TRANSITION");
      if (action === "REQUEST_CHANGES" && !feedback?.trim()) throw new Error("FEEDBACK_REQUIRED");
      const next = action === "START" ? "IN_PROGRESS" : action === "SUBMIT" ? "SUBMITTED" : action === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED";
      const updated = await tx.collaborationMilestone.update({ where: { id: milestoneId }, data: {
        status: next, ...(action === "SUBMIT" ? { submittedAt: new Date(), feedback: null } : {}),
        ...(["APPROVE", "REQUEST_CHANGES"].includes(action) ? { reviewedAt: new Date(), feedback: action === "REQUEST_CHANGES" ? feedback : null } : {}),
      }});
      await tx.collaborationEvent.create({ data: { collaborationId: id, actorId: user.id, action: `MILESTONE_${action}`, message: message ?? feedback ?? milestone.title, metadata: { milestoneId, from: milestone.status, to: next } } });
      const recipients = isCreator ? brandRecipients : [collab.creatorProfile.userId];
      await notify(tx, recipients, `MILESTONE_${next}`, `Milestone ${next.toLowerCase().replace("_", " ")}`, `"${milestone.title}" was ${next.toLowerCase().replace("_", " ")}.`);
      return { milestone: updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "This collaboration changed concurrently. Refresh and retry." }, { status: 409 });
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        CREATOR_ONLY: "Only the creator can perform this action.", BRAND_ONLY: "Only the brand can perform this action.",
        INVALID_TRANSITION: "This collaboration status transition is not allowed.", STATUS_CONFLICT: "The collaboration status changed. Refresh and retry.",
        AGREEMENT_REQUIRED: "The agreement must be fully accepted before completing the collaboration.",
        WORK_REMAINS: "Approve every deliverable and milestone before completing the collaboration.",
        MILESTONE_REQUIRED: "Select a milestone.", MILESTONE_NOT_FOUND: "Milestone not found.",
        COLLAB_INACTIVE: "Milestones cannot change while the collaboration is inactive.",
        INVALID_MILESTONE_TRANSITION: "This milestone status transition is not allowed.",
        FEEDBACK_REQUIRED: "Feedback is required when requesting changes.",
      };
      if (messages[error.message]) return NextResponse.json({ error: messages[error.message] }, { status: 409 });
    }
    throw error;
  }
}
