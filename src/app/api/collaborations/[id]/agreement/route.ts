import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const draftSchema = z.object({
  title: z.string().trim().min(3).max(150),
  terms: z.string().trim().min(50).max(12000),
});
const actionSchema = z.object({
  action: z.enum(["SHARE", "ACCEPT", "REQUEST_CHANGES", "DECLINE"]),
  acceptanceName: z.string().trim().min(2).max(120).optional(),
  note: z.string().trim().max(2000).optional(),
});

async function getCollaboration(id: string) {
  return prisma.collaboration.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      creatorProfile: { select: { userId: true } },
      campaign: {
        select: {
          title: true,
          brand: {
            select: {
              name: true,
              members: { select: { userId: true } },
            },
          },
        },
      },
    },
  });
}

function requestEvidence(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) || null,
  };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = draftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide an agreement title and at least 50 characters of terms." }, { status: 400 });
  }

  const collab = await getCollaboration(id);
  if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  const isBrandOwner = collab.campaign.brand.members.some((member) => member.userId === user.id);
  if (!isBrandOwner) return NextResponse.json({ error: "Only the brand owner can prepare the agreement." }, { status: 403 });
  if (collab.status !== "ACTIVE") return NextResponse.json({ error: "Agreements cannot be changed on an inactive collaboration." }, { status: 409 });

  const agreement = await prisma.$transaction(async (tx) => {
    const existing = await tx.collaborationAgreement.findUnique({ where: { collaborationId: id } });
    if (existing?.status === "EXECUTED") {
      throw new Error("EXECUTED_AGREEMENT_LOCKED");
    }

    if (!existing) {
      const created = await tx.collaborationAgreement.create({
        data: { collaborationId: id, ...parsed.data, status: "DRAFT", currentVersion: 1 },
      });
      await tx.collaborationAgreementVersion.create({
        data: { agreementId: created.id, version: 1, ...parsed.data, createdById: user.id, status: "DRAFT" },
      });
      return created;
    }

    const nextVersion = existing.status === "DRAFT" ? existing.currentVersion : existing.currentVersion + 1;
    const version = await tx.collaborationAgreementVersion.findUnique({
      where: { agreementId_version: { agreementId: existing.id, version: nextVersion } },
      select: { id: true },
    });
    if (version) {
      await tx.collaborationAgreementVersion.update({
        where: { id: version.id },
        data: { ...parsed.data, createdById: user.id, status: "DRAFT", acceptedAt: null, brandAcceptedAt: null, brandAcceptedById: null, brandAcceptedName: null, brandAcceptedIp: null, brandAcceptedUserAgent: null, creatorAcceptedAt: null, creatorAcceptedById: null, creatorAcceptedName: null, creatorAcceptedIp: null, creatorAcceptedUserAgent: null },
      });
    } else {
      await tx.collaborationAgreementVersion.create({
        data: { agreementId: existing.id, version: nextVersion, ...parsed.data, createdById: user.id, status: "DRAFT" },
      });
    }
    return tx.collaborationAgreement.update({
      where: { id: existing.id },
      data: { ...parsed.data, status: "DRAFT", currentVersion: nextVersion },
    });
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "EXECUTED_AGREEMENT_LOCKED") return null;
    throw error;
  });

  if (!agreement) return NextResponse.json({ error: "An executed agreement is immutable. Create a separate amendment workflow before changing it." }, { status: 409 });

  await prisma.auditLog.create({
    data: { actorId: user.id, action: "AGREEMENT_DRAFT_SAVED", entityType: "CollaborationAgreement", entityId: agreement.id, metadata: { collaborationId: id, version: agreement.currentVersion } },
  });
  return NextResponse.json({ agreement });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid agreement action." }, { status: 400 });

  const collab = await getCollaboration(id);
  if (!collab) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  if (collab.status !== "ACTIVE") return NextResponse.json({ error: "This collaboration is not active." }, { status: 409 });

  const isBrandOwner = collab.campaign.brand.members.some((member) => member.userId === user.id);
  const isCreator = collab.creatorProfile.userId === user.id;
  const { action, acceptanceName, note } = parsed.data;
  const evidence = requestEvidence(request);

  if (action === "SHARE") {
    if (!isBrandOwner) return NextResponse.json({ error: "Only the brand owner can share an agreement." }, { status: 403 });
    if (!acceptanceName) return NextResponse.json({ error: "Enter your full name to approve and share this agreement." }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const agreement = await tx.collaborationAgreement.findUnique({ where: { collaborationId: id } });
      if (!agreement || agreement.status !== "DRAFT") throw new Error("AGREEMENT_NOT_DRAFT");
      const version = await tx.collaborationAgreementVersion.findUnique({
        where: { agreementId_version: { agreementId: agreement.id, version: agreement.currentVersion } },
      });
      if (!version || version.status !== "DRAFT") throw new Error("AGREEMENT_VERSION_NOT_DRAFT");
      await tx.collaborationAgreementVersion.update({
        where: { id: version.id },
        data: { status: "PENDING_CREATOR", brandAcceptedAt: new Date(), brandAcceptedById: user.id, brandAcceptedName: acceptanceName, brandAcceptedIp: evidence.ip, brandAcceptedUserAgent: evidence.userAgent },
      });
      const updated = await tx.collaborationAgreement.update({ where: { id: agreement.id }, data: { status: "PENDING_CREATOR" } });
      await tx.notification.create({
        data: { userId: collab.creatorProfile.userId, type: "AGREEMENT_REQUIRES_ACTION", title: "Agreement ready for your review", body: `The brand shared an agreement for ${collab.campaign.title}. Review the terms and accept or request changes.`, href: `/dashboard/creator/collaborations/${id}` },
      });
      await tx.auditLog.create({
        data: { actorId: user.id, action: "AGREEMENT_SHARED", entityType: "CollaborationAgreement", entityId: agreement.id, metadata: { collaborationId: id, version: agreement.currentVersion, signerName: acceptanceName } },
      });
      return updated;
    }).catch((error: unknown) => {
      if (error instanceof Error && ["AGREEMENT_NOT_DRAFT", "AGREEMENT_VERSION_NOT_DRAFT"].includes(error.message)) return null;
      throw error;
    });
    if (!result) return NextResponse.json({ error: "Save a draft before sharing it. Only a draft can be shared." }, { status: 409 });
    return NextResponse.json({ agreement: result });
  }

  if (!isCreator) return NextResponse.json({ error: "Only the creator assigned to this collaboration can respond." }, { status: 403 });
  if (action === "ACCEPT" && !acceptanceName) {
    return NextResponse.json({ error: "Enter your full name to accept this agreement." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const agreement = await tx.collaborationAgreement.findUnique({ where: { collaborationId: id } });
    if (!agreement || agreement.status !== "PENDING_CREATOR") throw new Error("AGREEMENT_NOT_AWAITING_CREATOR");
    const version = await tx.collaborationAgreementVersion.findUnique({
      where: { agreementId_version: { agreementId: agreement.id, version: agreement.currentVersion } },
    });
    if (!version || version.status !== "PENDING_CREATOR") throw new Error("AGREEMENT_VERSION_NOT_AWAITING_CREATOR");

    const nextStatus = action === "ACCEPT" ? "EXECUTED" : action === "DECLINE" ? "DECLINED" : "CHANGES_REQUESTED";
    await tx.collaborationAgreementVersion.update({
      where: { id: version.id },
      data: action === "ACCEPT"
        ? { status: nextStatus, acceptedAt: new Date(), creatorAcceptedAt: new Date(), creatorAcceptedById: user.id, creatorAcceptedName: acceptanceName, creatorAcceptedIp: evidence.ip, creatorAcceptedUserAgent: evidence.userAgent }
        : { status: nextStatus },
    });
    const updated = await tx.collaborationAgreement.update({ where: { id: agreement.id }, data: { status: nextStatus } });
    const brandMemberIds = [...new Set(collab.campaign.brand.members.map((member) => member.userId))].filter((memberId) => memberId !== user.id);
    if (brandMemberIds.length > 0) {
      const title = action === "ACCEPT" ? "Agreement accepted" : action === "DECLINE" ? "Agreement declined" : "Changes requested on agreement";
      const body = action === "REQUEST_CHANGES" ? (note || "The creator requested changes to the agreement.") : action === "ACCEPT" ? `The creator accepted the agreement for ${collab.campaign.title}.` : `The creator declined the agreement for ${collab.campaign.title}.`;
      await tx.notification.createMany({
        data: brandMemberIds.map((userId) => ({ userId, type: `AGREEMENT_${action}`, title, body, href: `/dashboard/brand/collaborations/${id}` })),
      });
    }
    await tx.auditLog.create({
      data: { actorId: user.id, action: `AGREEMENT_${action}`, entityType: "CollaborationAgreement", entityId: agreement.id, metadata: { collaborationId: id, version: agreement.currentVersion, signerName: acceptanceName || null, note: note || null } },
    });
    return updated;
  }).catch((error: unknown) => {
    if (error instanceof Error && ["AGREEMENT_NOT_AWAITING_CREATOR", "AGREEMENT_VERSION_NOT_AWAITING_CREATOR"].includes(error.message)) return null;
    throw error;
  });

  if (!result) return NextResponse.json({ error: "There is no agreement awaiting your response." }, { status: 409 });
  return NextResponse.json({ agreement: result });
}
