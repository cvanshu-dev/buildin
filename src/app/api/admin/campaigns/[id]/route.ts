import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "PAUSED", "CLOSED"]) });
const transitions: Record<string, string[]> = { DRAFT: ["PUBLISHED"], PUBLISHED: ["PAUSED", "CLOSED"], PAUSED: ["PUBLISHED", "CLOSED"], CLOSED: [] };
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(actor.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid campaign status." }, { status: 400 });
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { id: true, status: true, applicationDeadline: true, assignedManagerId: true } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  if (actor.role === "CAMPAIGN_MANAGER" && campaign.assignedManagerId !== actor.id) return NextResponse.json({ error: "This campaign is not assigned to you." }, { status: 403 });
  if (campaign.status !== parsed.data.status && !transitions[campaign.status]?.includes(parsed.data.status)) return NextResponse.json({ error: "This campaign status transition is not allowed." }, { status: 409 });
  if (parsed.data.status === "PUBLISHED" && campaign.applicationDeadline && campaign.applicationDeadline <= new Date()) return NextResponse.json({ error: "Campaign has an expired application deadline." }, { status: 409 });
  const updated = await prisma.campaign.update({ where: { id }, data: { status: parsed.data.status } });
  await writeAuditLog({ actorId: actor.id, action: "CAMPAIGN_STATUS_CHANGED", entityType: "CAMPAIGN", entityId: id, metadata: { previousStatus: campaign.status, nextStatus: updated.status } });
  return NextResponse.json({ campaign: updated });
}
