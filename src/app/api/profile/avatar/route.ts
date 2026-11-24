import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  image: z.string().url().max(2048),
  publicId: z.string().min(1).max(240),
});

function isCloudinaryAssetUrl(image: string, publicId: string, userId: string) {
  try {
    const url = new URL(image);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return false;

    // Ignore optional delivery transformations, but require the exact public ID
    // to occur in the path after the /upload/ segment.
    const path = decodeURIComponent(url.pathname);
    const uploadIndex = path.indexOf("/upload/");
    if (uploadIndex < 0) return false;

    const deliveryPath = path.slice(uploadIndex + "/upload/".length);
    const withoutTransforms = deliveryPath.replace(/^(?:[a-zA-Z0-9_,./-]+\/)?(?=v\d+\/)/, "");
    const publicIdPath = publicId.split("/").map(encodeURIComponent).join("/");
    return (
      publicId.startsWith(`buildin/creators/${userId}/avatar/`) &&
      withoutTransforms.includes(publicId) &&
      (deliveryPath.includes(publicId) || decodeURIComponent(deliveryPath).includes(publicId))
    );
  } catch {
    return false;
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "CREATOR") {
      return NextResponse.json({ error: "Creator account required." }, { status: 403 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid profile image URL and verified upload ID are required." }, { status: 400 });
    }

    const { image, publicId } = parsed.data;
    if (!isCloudinaryAssetUrl(image, publicId, user.id)) {
      return NextResponse.json({ error: "Profile image URL does not match your verified Cloudinary avatar." }, { status: 400 });
    }

    const media = await prisma.mediaAsset.findFirst({
      where: {
        ownerUserId: user.id,
        publicId,
        context: "avatar",
        resourceType: "image",
        linkedAt: null,
      },
      select: { id: true },
    });

    if (!media) {
      return NextResponse.json(
        { error: "Avatar upload is not verified, already attached, or does not belong to this account." },
        { status: 403 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Claim the upload first. A conditional update is the concurrency guard.
      const linked = await tx.mediaAsset.updateMany({
        where: {
          id: media.id,
          ownerUserId: user.id,
          publicId,
          context: "avatar",
          resourceType: "image",
          linkedAt: null,
        },
        data: { linkedAt: new Date() },
      });
      if (linked.count !== 1) throw new Error("MEDIA_ALREADY_LINKED");

      return tx.user.update({
        where: { id: user.id },
        data: { image },
        select: { image: true },
      });
    });

    return NextResponse.json({ ok: true, image: result.image });
  } catch (error) {
    if (error instanceof Error && error.message === "MEDIA_ALREADY_LINKED") {
      return NextResponse.json({ error: "Avatar upload was already attached. Upload again." }, { status: 409 });
    }
    console.error("[Avatar] Update failed:", error);
    return NextResponse.json({ error: "Unable to update profile avatar." }, { status: 500 });
  }
}
