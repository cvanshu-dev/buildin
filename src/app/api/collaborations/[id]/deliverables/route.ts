import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
const createSchema = z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().max(1000).optional(), dueAt: z.string().datetime().optional().nullable() });
const updateSchema = z.object({ deliverableId: z.string().min(1), action: z.enum(["SUBMIT", "APPROVE", "REQUEST_CHANGES"]), assetUrl: z.string().url().max(2048).optional(), feedback: z.string().trim().max(1000).optional() });
async function access(id: string, userId: string) {
  return prisma.collaboration.findFirst({ where: { id, OR: [{ creatorProfile: { userId } }, { campaign: { brand: { members: { some: { userId } } } }] } }, select: { id: true, creatorProfile: { select: { userId: true } } } });
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params; const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid deliverable." }, { status: 400 });
  const collab = await access(id, user.id); if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  if (collab.creatorProfile.userId === user.id) return NextResponse.json({ error: "Only the brand can create deliverable requirements." }, { status: 403 });
  const item = await prisma.deliverable.create({ data: { collaborationId: id, title: parsed.data.title, description: parsed.data.description, dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null } });
  return NextResponse.json({ deliverable: item }, { status: 201 });
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params; const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid deliverable update." }, { status: 400 });
  const collab = await access(id, user.id); if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  const item = await prisma.deliverable.findFirst({ where: { id: parsed.data.deliverableId, collaborationId: id } });
  if (!item) return NextResponse.json({ error: "Deliverable not found." }, { status: 404 });
  const isCreator = collab.creatorProfile.userId === user.id;
  const action = parsed.data.action;
  if (action === "SUBMIT" && !isCreator) return NextResponse.json({ error: "Only the creator can submit work." }, { status: 403 });
  if (action !== "SUBMIT" && isCreator) return NextResponse.json({ error: "Only the brand can review work." }, { status: 403 });
  const data = action === "SUBMIT"
    ? { status: "SUBMITTED", assetUrl: parsed.data.assetUrl ?? item.assetUrl, submittedAt: new Date(), feedback: null }
    : action === "APPROVE"
      ? { status: "APPROVED", feedback: parsed.data.feedback ?? null, reviewedAt: new Date() }
      : { status: "CHANGES_REQUESTED", feedback: parsed.data.feedback ?? "Please revise and resubmit.", reviewedAt: new Date() };
  const updated = await prisma.deliverable.update({ where: { id: item.id }, data });
  return NextResponse.json({ deliverable: updated });
}
