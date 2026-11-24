import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  mediaUrl: z.string().url().max(2048),
  mediaType: z.enum(["IMAGE", "VIDEO", "LINK"]).default("IMAGE"),
  publicId: z.string().min(1).max(240).optional(),
  resourceType: z.enum(["image", "video", "raw"]).optional(),
});

function isOwnedCloudinaryUrl(urlValue: string, publicId: string, userId: string) {
  try {
    const url = new URL(urlValue);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return false;
    const path = decodeURIComponent(url.pathname);
    const uploadIndex = path.indexOf("/upload/");
    if (uploadIndex < 0) return false;
    const deliveryPath = path.slice(uploadIndex + "/upload/".length);
    return (
      publicId.startsWith(`buildin/creators/${userId}/portfolio/`) &&
      deliveryPath.includes(publicId)
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid item." }, { status: 400 });

  const { publicId, resourceType, mediaUrl, mediaType, description, title } = parsed.data;
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });

  if (publicId) {
    if (!resourceType || !isOwnedCloudinaryUrl(mediaUrl, publicId, user.id)) {
      return NextResponse.json({ error: "Uploaded portfolio media must match a verified asset in your creator folder." }, { status: 400 });
    }
    if ((resourceType === "video" && mediaType !== "VIDEO") ||
        (resourceType === "image" && mediaType !== "IMAGE") ||
        resourceType === "raw") {
      return NextResponse.json({ error: "Portfolio media type does not match the uploaded asset." }, { status: 400 });
    }
  }

  try {
    const item = await prisma.$transaction(async (tx) => {
      const count = await tx.portfolioItem.count({ where: { creatorProfileId: profile.id } });
      if (count >= 30) throw new Error("PORTFOLIO_LIMIT");

      if (publicId && resourceType) {
        const verified = await tx.mediaAsset.findFirst({
          where: {
            ownerUserId: user.id,
            publicId,
            context: "portfolio",
            resourceType,
            linkedAt: null,
          },
          select: { id: true },
        });
        if (!verified) throw new Error("MEDIA_NOT_VERIFIED");

        const linked = await tx.mediaAsset.updateMany({
          where: {
            id: verified.id,
            ownerUserId: user.id,
            publicId,
            context: "portfolio",
            resourceType,
            linkedAt: null,
          },
          data: { linkedAt: new Date() },
        });
        if (linked.count !== 1) throw new Error("MEDIA_ALREADY_LINKED");
      }

      return tx.portfolioItem.create({
        data: {
          title,
          description: description || null,
          mediaUrl,
          mediaType,
          ...(publicId ? { publicId } : {}),
          ...(resourceType ? { resourceType } : {}),
          creatorProfileId: profile.id,
          sortOrder: count,
        },
      });
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PORTFOLIO_LIMIT") {
      return NextResponse.json({ error: "Portfolio limit is 30 items." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "MEDIA_NOT_VERIFIED") {
      return NextResponse.json({ error: "This upload is not verified or does not belong to your account." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "MEDIA_ALREADY_LINKED") {
      return NextResponse.json({ error: "This upload has already been attached. Upload it again before adding it." }, { status: 409 });
    }
    console.error("[Portfolio] Create failed:", error);
    return NextResponse.json({ error: "Unable to add portfolio item." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Item id is required." }, { status: 400 });

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  const item = await prisma.portfolioItem.findFirst({
    where: { id, creatorProfileId: profile?.id },
  });
  if (!item) return NextResponse.json({ error: "Item not found." }, { status: 404 });

  if (item.publicId && item.resourceType) {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !key || !secret) return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });

    const timestamp = String(Math.floor(Date.now() / 1000));
    const params = { public_id: item.publicId, timestamp };
    const signature = createHash("sha1")
      .update(Object.keys(params).sort().map((name) => `${name}=${params[name as keyof typeof params]}`).join("&") + secret)
      .digest("hex");

    const form = new FormData();
    form.set("public_id", item.publicId);
    form.set("timestamp", timestamp);
    form.set("api_key", key);
    form.set("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/${item.resourceType}/destroy`,
      { method: "POST", body: form, cache: "no-store" },
    );
    const result = await response.json() as { result?: string; error?: { message?: string } };
    if (!response.ok || !["ok", "not found"].includes(result.result ?? "")) {
      return NextResponse.json({ error: result.error?.message ?? "Cloudinary deletion failed." }, { status: 502 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.portfolioItem.delete({ where: { id: item.id } });
    if (item.publicId) {
      await tx.mediaAsset.deleteMany({
        where: { ownerUserId: user.id, publicId: item.publicId, context: "portfolio" },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
