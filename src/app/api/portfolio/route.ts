import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { findOwnedVerifiedMedia, isCloudinarySecureUrl } from "@/lib/media-assets";

const schema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  mediaUrl: z.string().url().max(2048),
  mediaType: z.enum(["IMAGE", "VIDEO", "LINK"]).default("IMAGE"),
  publicId: z.string().min(1).max(240).optional(),
  resourceType: z.enum(["image", "video", "raw"]).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid item." }, { status: 400 });

  const profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });

  const { publicId, resourceType, mediaUrl, mediaType } = parsed.data;
  if (publicId) {
    if (!resourceType || !isCloudinarySecureUrl(mediaUrl) || !mediaUrl.includes(encodeURIComponent(publicId).replace(/%2F/g, "/"))) {
      return NextResponse.json({ error: "Invalid uploaded portfolio media reference." }, { status: 400 });
    }
    if ((mediaType === "IMAGE" && resourceType !== "image") || (mediaType === "VIDEO" && resourceType !== "video") || mediaType === "LINK") {
      return NextResponse.json({ error: "The selected portfolio type does not match the uploaded file." }, { status: 400 });
    }
    const asset = await findOwnedVerifiedMedia({
      ownerUserId: user.id,
      publicId,
      context: "portfolio",
      expectedPrefix: `buildin/creators/${user.id}/portfolio/`,
    });
    if (!asset || asset.resourceType !== resourceType) {
      return NextResponse.json({ error: "This upload is not verified or does not belong to your account." }, { status: 403 });
    }
  } else if (isCloudinarySecureUrl(mediaUrl) || mediaType !== "LINK") {
    return NextResponse.json({ error: "Upload and verify media before adding it to your portfolio. External URLs must be added as links." }, { status: 400 });
  }

  const count = await prisma.portfolioItem.count({ where: { creatorProfileId: profile.id } });
  if (count >= 30) return NextResponse.json({ error: "Portfolio limit is 30 items." }, { status: 400 });

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.portfolioItem.create({
      data: { ...parsed.data, description: parsed.data.description || null, creatorProfileId: profile.id, sortOrder: count },
    });
    if (publicId) {
      const linked = await tx.mediaAsset.updateMany({
        where: { ownerUserId: user.id, publicId, linkedAt: null, bytes: { gt: 0 } },
        data: { linkedAt: new Date() },
      });
      if (linked.count !== 1) throw new Error("MEDIA_LINK_CONFLICT");
    }
    return created;
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "MEDIA_LINK_CONFLICT") return null;
    throw error;
  });

  if (!item) return NextResponse.json({ error: "This upload has already been attached or is no longer available. Upload it again." }, { status: 409 });
  return NextResponse.json({ ok: true, item }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Item id is required." }, { status: 400 });
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  const item = await prisma.portfolioItem.findFirst({ where: { id, creatorProfileId: profile?.id } });
  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  if (item.publicId && item.resourceType) {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !key || !secret) return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });

    const timestamp = String(Math.floor(Date.now() / 1000));
    const params = { public_id: item.publicId, timestamp };
    const signature = createHash("sha1").update(Object.keys(params).sort().map((name) => `${name}=${params[name as keyof typeof params]}`).join("&") + secret).digest("hex");
    const form = new FormData();
    form.set("public_id", item.publicId);
    form.set("timestamp", timestamp);
    form.set("api_key", key);
    form.set("signature", signature);

    let response: Response;
    try {
      response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${item.resourceType}/destroy`, { method: "POST", body: form, cache: "no-store" });
    } catch {
      return NextResponse.json({ error: "Cloudinary could not be reached. The portfolio item was not deleted." }, { status: 502 });
    }
    const result = await response.json().catch(() => ({})) as { result?: string; error?: { message?: string } };
    if (!response.ok || !["ok", "not found"].includes(result.result ?? "")) {
      return NextResponse.json({ error: result.error?.message ?? "Cloudinary deletion failed. The portfolio item was not deleted." }, { status: 502 });
    }
  }

  await prisma.$transaction([
    prisma.portfolioItem.delete({ where: { id: item.id } }),
    ...(item.publicId ? [prisma.mediaAsset.deleteMany({ where: { ownerUserId: user.id, publicId: item.publicId } })] : []),
  ]);
  return NextResponse.json({ ok: true });
}
