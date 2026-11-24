import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const createSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  url: z.string().url().max(2048),
  publicId: z.string().min(1).max(240),
  resourceType: z.enum(["image", "video", "raw"]),
  bytes: z.number().int().positive().max(25 * 1024 * 1024),
});

async function campaignForOwner(campaignId: string, userId: string) {
  return prisma.campaign.findFirst({
    where: { id: campaignId, brand: { members: { some: { userId, title: "Owner" } } } },
    select: { id: true, brandId: true },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const campaign = user.role === "BRAND" ? await campaignForOwner(id, user.id) : null;
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  const attachments = await prisma.campaignBriefAttachment.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ attachments });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
  const { id } = await context.params;
  const campaign = await campaignForOwner(id, user.id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid attachment." }, { status: 400 });
  const url = new URL(parsed.data.url);
  const expectedPrefix = `buildin/brands/${campaign.brandId}/campaigns/${id}/brief/`;
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !parsed.data.publicId.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Attachment must be an asset uploaded to this campaign's brief folder." }, { status: 400 });
  }
  const count = await prisma.campaignBriefAttachment.count({ where: { campaignId: id } });
  if (count >= 20) return NextResponse.json({ error: "A campaign can have at most 20 brief attachments." }, { status: 409 });
  const attachment = await prisma.campaignBriefAttachment.create({ data: { ...parsed.data, campaignId: id } });
  await prisma.mediaAsset.updateMany({ where: { ownerUserId: user.id, publicId: parsed.data.publicId }, data: { linkedAt: new Date() } });
  return NextResponse.json({ attachment }, { status: 201 });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
  const { id } = await context.params;
  const campaign = await campaignForOwner(id, user.id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  const attachmentId = new URL(request.url).searchParams.get("attachmentId");
  if (!attachmentId) return NextResponse.json({ error: "Attachment ID is required." }, { status: 400 });
  const attachment = await prisma.campaignBriefAttachment.findFirst({ where: { id: attachmentId, campaignId: id } });
  if (!attachment) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });

  if (attachment.publicId) {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !key || !secret) return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const params = { public_id: attachment.publicId, timestamp };
    const signature = createHash("sha1").update(Object.keys(params).sort().map((name) => `${name}=${params[name as keyof typeof params]}`).join("&") + secret).digest("hex");
    const form = new FormData();
    form.set("public_id", attachment.publicId);
    form.set("timestamp", timestamp);
    form.set("api_key", key);
    form.set("signature", signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${attachment.resourceType}/destroy`, { method: "POST", body: form, cache: "no-store" });
    const result = await response.json() as { result?: string; error?: { message?: string } };
    if (!response.ok || !["ok", "not found"].includes(result.result ?? "")) return NextResponse.json({ error: result.error?.message ?? "Cloudinary deletion failed." }, { status: 502 });
  }
  await prisma.campaignBriefAttachment.delete({ where: { id: attachment.id } });
  if (attachment.publicId) await prisma.mediaAsset.deleteMany({ where: { ownerUserId: user.id, publicId: attachment.publicId } });
  return NextResponse.json({ ok: true });
}
