import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "PAUSED", "CLOSED"]).optional(),
  assignedManagerId: z.string().min(1).nullable().optional(),
}).refine((value) => value.status !== undefined || value.assignedManagerId !== undefined);
const transitions: Record<string, string[]> = { DRAFT: ["PUBLISHED"], PUBLISHED: ["PAUSED", "CLOSED"], PAUSED: ["PUBLISHED", "CLOSED"], CLOSED: [] };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid campaign update." }, { status: 400 });
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { id: true, status: true, applicationDeadline: true, assignedManagerId: true } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  if (actor.role === "CAMPAIGN_MANAGER") {
    if (campaign.assignedManagerId !== actor.id) return NextResponse.json({ error: "This campaign is not assigned to you." }, { status: 403 });
    if (parsed.data.assignedManagerId !== undefined) return NextResponse.json({ error: "Campaign managers cannot reassign campaigns." }, { status: 403 });
  }
  if (parsed.data.status && campaign.status !== parsed.data.status && !transitions[campaign.status]?.includes(parsed.data.status)) {
    return NextResponse.json({ error: "This campaign status transition is not allowed." }, { status: 409 });
  }
  if (parsed.data.status === "PUBLISHED" && campaign.applicationDeadline && campaign.applicationDeadline <= new Date()) {
    return NextResponse.json({ error: "Campaign has an expired application deadline." }, { status: 409 });
  }
  if (parsed.data.assignedManagerId) {
    const manager = await prisma.user.findFirst({ where: { id: parsed.data.assignedManagerId, role: "CAMPAIGN_MANAGER", status: "ACTIVE" }, select: { id: true } });
    if (!manager) return NextResponse.json({ error: "Select an active campaign manager." }, { status: 400 });
  }
  const updated = await prisma.campaign.update({
    where: { id },
    data: { ...(parsed.data.status ? { status: parsed.data.status } : {}), ...(parsed.data.assignedManagerId !== undefined ? { assignedManagerId: parsed.data.assignedManagerId } : {}) },
    select: { id: true, title: true, status: true, assignedManagerId: true },
  });
  await writeAuditLog({
    actorId: actor.id, action: parsed.data.assignedManagerId !== undefined ? "CAMPAIGN_MANAGER_ASSIGNED" : "CAMPAIGN_STATUS_CHANGED",
    entityType: "CAMPAIGN", entityId: id,
    metadata: { previousStatus: campaign.status, nextStatus: updated.status, previousManagerId: campaign.assignedManagerId, nextManagerId: updated.assignedManagerId },
  });
  return NextResponse.json({ campaign: updated });
}
