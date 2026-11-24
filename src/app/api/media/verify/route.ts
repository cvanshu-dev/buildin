import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const schema = z.object({
  context: z.enum(["avatar", "brand-logo", "portfolio", "campaign-cover", "campaign-brief", "deliverable"]),
  publicId: z.string().min(1).max(240),
  resourceType: z.enum(["image", "video", "raw"]),
  collaborationId: z.string().optional(),
  campaignId: z.string().optional(),
});

function cloudinarySignature(params: Record<string, string>, secret: string) {
  const value = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  return createHash("sha1").update(value + secret).digest("hex");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid uploaded asset." }, { status: 400 });

  const { context, publicId, resourceType, collaborationId, campaignId } = parsed.data;
  const pending = await prisma.mediaAsset.findUnique({ where: { publicId } });
  if (!pending || pending.ownerUserId !== user.id || pending.context !== context || pending.resourceType !== "auto" ||
      pending.linkedAt || pending.createdAt.getTime() < Date.now() - 30 * 60 * 1000) {
    return NextResponse.json({ error: "Upload authorization expired or does not belong to this account. Start the upload again." }, { status: 403 });
  }

  let expectedPrefix = "";
  let maxBytes = 8 * 1024 * 1024;
  const formats: Record<string, string[]> = {
    avatar: ["jpg", "jpeg", "png", "webp"],
    "brand-logo": ["jpg", "jpeg", "png", "webp"],
    "campaign-cover": ["jpg", "jpeg", "png", "webp"],
    portfolio: ["jpg", "jpeg", "png", "webp", "mp4", "mov"],
    deliverable: ["jpg", "jpeg", "png", "webp", "mp4", "mov", "pdf", "doc", "docx"],
    "campaign-brief": ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "csv", "jpg", "jpeg", "png", "webp"],
  };

  if (context === "avatar" || context === "portfolio") {
    if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });
    const profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
    expectedPrefix = `buildin/creators/${user.id}/${context === "avatar" ? "avatar" : "portfolio"}/`;
    if (context === "portfolio") maxBytes = 100 * 1024 * 1024;
  } else if (context === "brand-logo" || context === "campaign-cover" || context === "campaign-brief") {
    if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
    const owner = await prisma.brandMember.findFirst({ where: { userId: user.id, title: "Owner" }, select: { brandId: true } });
    if (!owner) return NextResponse.json({ error: "Brand owner access required." }, { status: 403 });
    if (context === "campaign-brief") {
      if (!campaignId) return NextResponse.json({ error: "Campaign ID is required." }, { status: 400 });
      const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, brandId: owner.brandId }, select: { id: true } });
      if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
      expectedPrefix = `buildin/brands/${owner.brandId}/campaigns/${campaignId}/brief/`;
      maxBytes = 25 * 1024 * 1024;
    } else {
      expectedPrefix = `buildin/brands/${owner.brandId}/${context === "brand-logo" ? "logo" : "campaign-covers"}/`;
    }
  } else {
    if (user.role !== "CREATOR" || !collaborationId) return NextResponse.json({ error: "Creator collaboration required." }, { status: 403 });
    const collaboration = await prisma.collaboration.findFirst({ where: { id: collaborationId, status: "ACTIVE", creatorProfile: { userId: user.id } }, select: { id: true } });
    if (!collaboration) return NextResponse.json({ error: "Active collaboration not found." }, { status: 404 });
    expectedPrefix = `buildin/collaborations/${collaboration.id}/deliverables/`;
    maxBytes = 100 * 1024 * 1024;
  }

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });

  const adminUrl = `https://api.cloudinary.com/v1_1/${cloud}/resources/${resourceType}/upload/${publicId.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(adminUrl, { headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` }, cache: "no-store" });
  const asset = await response.json() as { public_id?: string; bytes?: number; format?: string; secure_url?: string; resource_type?: string; error?: { message?: string } };
  if (!response.ok || !asset.public_id) return NextResponse.json({ error: asset.error?.message ?? "Unable to verify uploaded file." }, { status: 502 });

  const imageOnly = ["avatar", "brand-logo", "campaign-cover"].includes(context);
  const valid = asset.public_id === publicId && asset.public_id.startsWith(expectedPrefix) &&
    typeof asset.bytes === "number" && asset.bytes > 0 && asset.bytes <= maxBytes &&
    formats[context].includes((asset.format ?? "").toLowerCase()) &&
    asset.resource_type === resourceType && (!imageOnly || resourceType === "image") &&
    (context !== "portfolio" || resourceType === "image" || resourceType === "video") &&
    Boolean(asset.secure_url && new URL(asset.secure_url).hostname === "res.cloudinary.com");

  if (!valid) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const params = { public_id: publicId, timestamp };
    const form = new FormData();
    form.set("public_id", publicId);
    form.set("timestamp", timestamp);
    form.set("api_key", key);
    form.set("signature", cloudinarySignature(params, secret));
    await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/destroy`, { method: "POST", body: form, cache: "no-store" }).catch(() => null);
    await prisma.mediaAsset.deleteMany({ where: { id: pending.id, ownerUserId: user.id, linkedAt: null } });
    return NextResponse.json({ error: "The uploaded file failed server-side ownership, type, or size validation and was rejected." }, { status: 400 });
  }

  const updated = await prisma.mediaAsset.updateMany({
    where: { id: pending.id, ownerUserId: user.id, publicId, context, resourceType: "auto", linkedAt: null },
    data: { resourceType, secureUrl: asset.secure_url!, bytes: asset.bytes!, format: asset.format ?? "unknown" },
  });
  if (updated.count !== 1) return NextResponse.json({ error: "Upload authorization was already used or expired. Start again." }, { status: 409 });

  return NextResponse.json({ ok: true, secureUrl: asset.secure_url, publicId, bytes: asset.bytes, format: asset.format, resourceType });
}
