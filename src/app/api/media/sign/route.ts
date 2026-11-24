import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const schema = z.object({
  context: z.enum(["avatar", "brand-logo", "portfolio", "campaign-cover", "campaign-brief", "deliverable"]),
  collaborationId: z.string().min(1).optional(),
  campaignId: z.string().min(1).optional(),
});
function sign(params: Record<string, string>, secret: string) {
  const value = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  return createHash("sha1").update(value + secret).digest("hex");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });

  const { context, collaborationId, campaignId } = parsed.data;
  let folder = "";
  let maxBytes = 8 * 1024 * 1024;
  let allowedFormats = "jpg,jpeg,png,webp";

  if (context === "avatar" || context === "portfolio") {
    if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });
    const profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
    folder = context === "avatar" ? `buildin/creators/${user.id}/avatar` : `buildin/creators/${user.id}/portfolio`;
    if (context === "portfolio") { maxBytes = 100 * 1024 * 1024; allowedFormats = "jpg,jpeg,png,webp,mp4,mov"; }
  } else if (context === "brand-logo" || context === "campaign-cover" || context === "campaign-brief") {
    if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
    const owner = await prisma.brandMember.findFirst({ where: { userId: user.id, title: "Owner" }, select: { brandId: true } });
    if (!owner) return NextResponse.json({ error: "Brand owner access required." }, { status: 403 });
    if (context === "campaign-brief") {
      if (!campaignId) return NextResponse.json({ error: "Campaign ID is required." }, { status: 400 });
      const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, brandId: owner.brandId }, select: { id: true } });
      if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
      const attachmentCount = await prisma.campaignBriefAttachment.count({ where: { campaignId } });
      if (attachmentCount >= 20) return NextResponse.json({ error: "A campaign can have at most 20 brief attachments." }, { status: 409 });
      folder = `buildin/brands/${owner.brandId}/campaigns/${campaignId}/brief`;
      maxBytes = 25 * 1024 * 1024;
      allowedFormats = "pdf,doc,docx,ppt,pptx,xls,xlsx,txt,csv,jpg,jpeg,png,webp";
    } else {
      folder = context === "brand-logo" ? `buildin/brands/${owner.brandId}/logo` : `buildin/brands/${owner.brandId}/campaign-covers`;
    }
  } else {
    if (user.role !== "CREATOR" || !collaborationId) return NextResponse.json({ error: "A creator collaboration is required." }, { status: 403 });
    const collaboration = await prisma.collaboration.findFirst({ where: { id: collaborationId, status: "ACTIVE", creatorProfile: { userId: user.id } }, select: { id: true } });
    if (!collaboration) return NextResponse.json({ error: "Active collaboration not found." }, { status: 404 });
    folder = `buildin/collaborations/${collaboration.id}/deliverables`;
    maxBytes = 100 * 1024 * 1024;
    allowedFormats = "jpg,jpeg,png,webp,mp4,mov,pdf,doc,docx";
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Cloudinary is not configured. Add server credentials." }, { status: 503 });

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = randomUUID();
  const params = { timestamp: String(timestamp), folder, public_id: publicId, allowed_formats: allowedFormats };
  await prisma.mediaAsset.create({ data: { ownerUserId: user.id, publicId, resourceType: "auto", secureUrl: "", context, bytes: 0, format: "pending" } });
  return NextResponse.json({ cloudName, apiKey, timestamp, folder, publicId, allowedFormats, maxBytes, signature: sign(params, apiSecret) });
}
