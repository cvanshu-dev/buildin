import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

function isCloudinaryDeliveryUrl(value: string, publicId: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return false;
    const path = decodeURIComponent(url.pathname);
    const uploadIndex = path.indexOf("/upload/");
    return uploadIndex >= 0 && path.slice(uploadIndex + "/upload/".length).includes(publicId);
  } catch {
    return false;
  }
}

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  dueAt: z.string().datetime().optional().nullable(),
});
const updateSchema = z.object({
  deliverableId: z.string().min(1),
  action: z.enum(["SUBMIT", "APPROVE", "REQUEST_CHANGES"]),
  assetUrl: z.string().url().max(2048).optional(),
  assets: z.array(z.object({ url: z.string().url().max(2048), publicId: z.string().min(1).max(240), resourceType: z.enum(["image", "video", "raw"]), bytes: z.number().int().positive().max(100 * 1024 * 1024), fileName: z.string().trim().min(1).max(180) })).max(10).optional(),
  submissionNote: z.string().trim().max(1000).optional(),
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
      campaign: { select: { title: true, brand: { select: { members: { where: { title: "Owner" }, select: { userId: true } } } } } },
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
  if (collab.creatorProfile.userId === user.id) return NextResponse.json({ error: "Only the brand can create deliverable requirements." }, { status: 403 });
  if (collab.status !== "ACTIVE") return NextResponse.json({ error: "Deliverables cannot be changed on an inactive collaboration." }, { status: 409 });
  const item = await prisma.deliverable.create({
    data: { collaborationId: id, title: parsed.data.title, description: parsed.data.description, dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null },
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
  if (collab.status !== "ACTIVE") return NextResponse.json({ error: "Deliverables cannot be changed on an inactive collaboration." }, { status: 409 });

  const item = await prisma.deliverable.findFirst({ where: { id: parsed.data.deliverableId, collaborationId: id } });
  if (!item) return NextResponse.json({ error: "Deliverable not found." }, { status: 404 });
  const isCreator = collab.creatorProfile.userId === user.id;
  const { action, assetUrl, assets, submissionNote, feedback } = parsed.data;

  if (action === "SUBMIT") {
    if (!isCreator) return NextResponse.json({ error: "Only the creator can submit work." }, { status: 403 });
    if (!assetUrl && !assets?.length) return NextResponse.json({ error: "Upload at least one deliverable file or provide a URL." }, { status: 400 });
    if (assets?.length) {
      const publicIds = assets.map((asset) => asset.publicId);
      if (new Set(publicIds).size !== publicIds.length) return NextResponse.json({ error: "Duplicate deliverable attachments are not allowed." }, { status: 400 });
      const verified = await prisma.mediaAsset.findMany({
        where: { ownerUserId: user.id, publicId: { in: publicIds }, context: "deliverable", linkedAt: null },
        select: { publicId: true, resourceType: true, bytes: true },
      });
      const verifiedById = new Map(verified.map((asset) => [asset.publicId, asset]));
      if (verified.length !== assets.length || assets.some((asset) => {
        const stored = verifiedById.get(asset.publicId);
        return !stored || stored.resourceType !== asset.resourceType || stored.bytes !== asset.bytes ||
          !asset.publicId.startsWith(`buildin/collaborations/${id}/deliverables/`) ||
          !isCloudinaryDeliveryUrl(asset.url, asset.publicId);
      })) return NextResponse.json({ error: "One or more deliverable uploads are unverified, already attached, or not owned by this account." }, { status: 403 });
    }
    if (assets?.some((asset) => {
      const url = new URL(asset.url);
      return url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !asset.publicId.startsWith(`buildin/collaborations/${id}/deliverables/`);
    })) return NextResponse.json({ error: "All uploaded files must belong to this collaboration." }, { status: 400 });
    if (item.status !== "PENDING" && item.status !== "CHANGES_REQUESTED") return NextResponse.json({ error: "Only pending deliverables or requested revisions can be submitted." }, { status: 409 });
  } else {
    if (isCreator) return NextResponse.json({ error: "Only the brand can review work." }, { status: 403 });
    if (item.status !== "SUBMITTED") return NextResponse.json({ error: "Only submitted deliverables can be reviewed." }, { status: 409 });
    if (action === "REQUEST_CHANGES" && !feedback?.trim()) return NextResponse.json({ error: "Feedback is required when requesting changes." }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (action === "SUBMIT") {
        const version = item.submissionVersion + 1;
        const submittedUrl = assets?.[0]?.url ?? assetUrl!;
        const result = await tx.deliverable.update({
          where: { id: item.id },
          data: { status: "SUBMITTED", assetUrl: submittedUrl, submittedAt: new Date(), feedback: null, reviewedAt: null, submissionVersion: version },
        });
        await tx.deliverableSubmission.create({
          data: { deliverableId: item.id, version, assetUrl: submittedUrl, note: submissionNote ?? null, submittedById: user.id, attachments: assets?.length ? { create: assets.map((asset) => ({ fileName: asset.fileName, url: asset.url, publicId: asset.publicId, resourceType: asset.resourceType, bytes: asset.bytes })) } : undefined },
        });
        if (assets?.length) {
          const linked = await tx.mediaAsset.updateMany({
            where: { ownerUserId: user.id, publicId: { in: assets.map((asset) => asset.publicId) }, context: "deliverable", linkedAt: null },
            data: { linkedAt: new Date() },
          });
          if (linked.count !== assets.length) throw new Error("MEDIA_ALREADY_LINKED");
        }
        for (const member of collab.campaign.brand.members) {
          await tx.notification.create({ data: { userId: member.userId, type: "DELIVERABLE_SUBMITTED", title: "Creator submitted work", body: `${user.name} submitted "${item.title}" for ${collab.campaign.title}.`, href: "/dashboard/brand" } });
        }
        return result;
      }

      const result = await tx.deliverable.update({
        where: { id: item.id },
        data: action === "APPROVE"
          ? { status: "APPROVED", feedback: feedback ?? null, reviewedAt: new Date() }
          : { status: "CHANGES_REQUESTED", feedback, reviewedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          userId: collab.creatorProfile.userId,
          type: action === "APPROVE" ? "DELIVERABLE_APPROVED" : "DELIVERABLE_CHANGES_REQUESTED",
          title: action === "APPROVE" ? "Deliverable approved" : "Changes requested",
          body: action === "APPROVE" ? `Your "${item.title}" submission was approved.` : `The brand requested changes to "${item.title}".`,
          href: `/dashboard/creator/collaborations/${id}`,
        },
      });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ deliverable: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "MEDIA_ALREADY_LINKED") {
      return NextResponse.json({ error: "One or more uploads were attached elsewhere. Refresh and upload again." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "This deliverable changed at the same time. Refresh and retry." }, { status: 409 });
    }
    throw error;
  }
}
