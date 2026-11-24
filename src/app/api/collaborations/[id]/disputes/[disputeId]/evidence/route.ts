import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  kind: z.enum(["NOTE", "URL", "MESSAGE", "DELIVERABLE", "MILESTONE", "FILE"]),
  label: z.string().trim().min(2).max(140),
  content: z.string().trim().max(4000).optional(),
  url: z.string().url().max(2048).optional(),
  referenceId: z.string().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string; disputeId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid evidence." }, { status: 400 });
  const { id, disputeId } = await context.params;
  const collaboration = await prisma.collaboration.findFirst({ where: { id, OR: [
    { creatorProfile: { userId: user.id } }, { campaign: { brand: { members: { some: { userId: user.id } } } } },
  ] }, select: { id: true } });
  if (!collaboration) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  const dispute = await prisma.collaborationDispute.findFirst({ where: { id: disputeId, collaborationId: id, status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { id: true } });
  if (!dispute) return NextResponse.json({ error: "Open dispute not found." }, { status: 404 });
  const input = parsed.data;
  if (input.kind === "URL" && (!input.url || !input.url.startsWith("https://"))) return NextResponse.json({ error: "Evidence links must use HTTPS." }, { status: 400 });
  let content = input.content || null, url = input.url || null;
  if (["MESSAGE", "DELIVERABLE", "MILESTONE", "FILE"].includes(input.kind)) {
    if (!input.referenceId) return NextResponse.json({ error: "A reference ID is required for this evidence type." }, { status: 400 });
    if (input.kind === "MESSAGE") {
      const row = await prisma.collaborationMessage.findFirst({ where: { id: input.referenceId, collaborationId: id }, select: { body: true } });
      if (!row) return NextResponse.json({ error: "Message does not belong to this collaboration." }, { status: 400 });
      content = row.body;
    } else if (input.kind === "DELIVERABLE") {
      const row = await prisma.deliverable.findFirst({ where: { id: input.referenceId, collaborationId: id }, select: { title: true, description: true, assetUrl: true, feedback: true } });
      if (!row) return NextResponse.json({ error: "Deliverable does not belong to this collaboration." }, { status: 400 });
      content = [row.title, row.description, row.feedback].filter(Boolean).join("\n");
      url = row.assetUrl;
    } else if (input.kind === "MILESTONE") {
      const row = await prisma.collaborationMilestone.findFirst({ where: { id: input.referenceId, collaborationId: id }, select: { title: true, description: true, status: true } });
      if (!row) return NextResponse.json({ error: "Milestone does not belong to this collaboration." }, { status: 400 });
      content = [row.title, row.description, `Status: ${row.status}`].filter(Boolean).join("\n");
    } else {
      const row = await prisma.deliverableSubmissionAttachment.findFirst({ where: { id: input.referenceId, submission: { deliverable: { collaborationId: id } } }, select: { fileName: true, url: true } });
      if (!row) return NextResponse.json({ error: "File does not belong to this collaboration." }, { status: 400 });
      content = row.fileName;
      url = row.url;
    }
  }
  if (url && !url.startsWith("https://")) return NextResponse.json({ error: "Evidence files and links must use HTTPS." }, { status: 400 });
  const evidence = await prisma.disputeEvidence.create({ data: { disputeId, submittedById: user.id, kind: input.kind, label: input.label, content, url, referenceId: input.referenceId || null } });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "DISPUTE_EVIDENCE_ADDED", entityType: "CollaborationDispute", entityId: disputeId, metadata: { collaborationId: id, evidenceId: evidence.id, kind: evidence.kind } } });
  return NextResponse.json({ evidence }, { status: 201 });
}
