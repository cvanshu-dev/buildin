import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  dueAt: z.string().datetime().optional().nullable(),
});
const updateSchema = z.object({
  deliverableId: z.string().min(1),
  action: z.enum(["SUBMIT", "APPROVE", "REQUEST_CHANGES"]),
  assetUrl: z.string().url().max(2048).optional(),
  feedback: z.string().trim().max(1000).optional(),
});

async function access(id: string, userId: string) {
  return prisma.collaboration.findFirst({
    where: {
      id,
      OR: [
        { creatorProfile: { userId } },
        { campaign: { brand: { members: { some: { userId } } } } },
      ],
    },
    select: {
      id: true,
      status: true,
      creatorProfile: { select: { userId: true } },
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid deliverable." }, { status: 400 });

  const collab = await access(id, user.id);
  if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  if (collab.creatorProfile.userId === user.id) {
    return NextResponse.json({ error: "Only the brand can create deliverable requirements." }, { status: 403 });
  }
  if (collab.status !== "ACTIVE") {
    return NextResponse.json({ error: "Deliverables cannot be changed on an inactive collaboration." }, { status: 409 });
  }

  const item = await prisma.deliverable.create({
    data: {
      collaborationId: id,
      title: parsed.data.title,
      description: parsed.data.description,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
  });
  return NextResponse.json({ deliverable: item }, { status: 201 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid deliverable update." }, { status: 400 });

  const collab = await access(id, user.id);
  if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  if (collab.status !== "ACTIVE") {
    return NextResponse.json({ error: "Deliverables cannot be changed on an inactive collaboration." }, { status: 409 });
  }

  const item = await prisma.deliverable.findFirst({
    where: { id: parsed.data.deliverableId, collaborationId: id },
  });
  if (!item) return NextResponse.json({ error: "Deliverable not found." }, { status: 404 });

  const isCreator = collab.creatorProfile.userId === user.id;
  const { action, assetUrl, feedback } = parsed.data;

  if (action === "SUBMIT") {
    if (!isCreator) {
      return NextResponse.json({ error: "Only the creator can submit work." }, { status: 403 });
    }
    if (!assetUrl) {
      return NextResponse.json({ error: "A deliverable URL is required for submission." }, { status: 400 });
    }
    if (item.status !== "PENDING" && item.status !== "CHANGES_REQUESTED") {
      return NextResponse.json({ error: "Only pending deliverables or requested revisions can be submitted." }, { status: 409 });
    }
  } else {
    if (isCreator) {
      return NextResponse.json({ error: "Only the brand can review work." }, { status: 403 });
    }
    if (item.status !== "SUBMITTED") {
      return NextResponse.json({ error: "Only submitted deliverables can be reviewed." }, { status: 409 });
    }
    if (action === "REQUEST_CHANGES" && !feedback?.trim()) {
      return NextResponse.json({ error: "Feedback is required when requesting changes." }, { status: 400 });
    }
  }

  const data = action === "SUBMIT"
    ? { status: "SUBMITTED", assetUrl, submittedAt: new Date(), feedback: null, reviewedAt: null }
    : action === "APPROVE"
      ? { status: "APPROVED", feedback: feedback ?? null, reviewedAt: new Date() }
      : { status: "CHANGES_REQUESTED", feedback, reviewedAt: new Date() };

  const updated = await prisma.deliverable.update({
    where: { id: item.id },
    data,
  });
  return NextResponse.json({ deliverable: updated });
}
