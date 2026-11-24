
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  image: z.string().url().max(2048),
  publicId: z.string().min(1).max(240),
});

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "CREATOR") {
      return NextResponse.json(
        { error: "Creator account required." },
        { status: 403 }
      );
    }

    const parsed = schema.safeParse(
      await request.json().catch(() => null)
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: "A valid profile image URL and verified upload ID are required." },
        { status: 400 }
      );
    }

    const { image, publicId: uploadedPublicId } = parsed.data;

    // Expected Cloudinary avatar folder.
    const expectedPrefix =
      `buildin/creators/${user.id}/avatar/`;

    // Validate the complete Cloudinary public ID.
    if (
      !uploadedPublicId.startsWith(expectedPrefix)
    ) {
      return NextResponse.json(
        {
          error:
            "Profile pictures must belong to your own Cloudinary avatar folder.",
        },
        { status: 400 }
      );
    }

    // Cloudinary public ID contains the folder.
    // Database stores only the UUID.
    const databasePublicId = uploadedPublicId
      .slice(expectedPrefix.length);

    // Reject malformed IDs or nested paths.
    if (
      !databasePublicId ||
      databasePublicId.includes("/") ||
      databasePublicId.includes("\\")
    ) {
      return NextResponse.json(
        { error: "Invalid avatar public ID." },
        { status: 400 }
      );
    }

    // Validate the image URL.
    let imageUrl: URL;

    try {
      imageUrl = new URL(image);
    } catch {
      return NextResponse.json(
        { error: "Invalid image URL." },
        { status: 400 }
      );
    }

    if (
      imageUrl.protocol !== "https:" ||
      imageUrl.hostname !== "res.cloudinary.com" ||
      !imageUrl.pathname.includes(`/${uploadedPublicId}`)
    ) {
      return NextResponse.json(
        {
          error:
            "Profile image URL does not match the verified Cloudinary avatar.",
        },
        { status: 400 }
      );
    }

    console.info("[Avatar] Looking up verified media:", {
      uploadedPublicId,
      databasePublicId,
      userId: user.id,
    });

    // IMPORTANT:
    // Look up using UUID, not the complete Cloudinary public ID.
    const media = await prisma.mediaAsset.findFirst({
      where: {
        ownerUserId: user.id,
        publicId: databasePublicId,
        context: "avatar",
        resourceType: "image",
        secureUrl: image,
        linkedAt: null,
      },
      select: {
        id: true,
        publicId: true,
      },
    });

    console.info("[Avatar] Verified media lookup:", {
      found: Boolean(media),
      publicIdMatches: media
        ? media.publicId === databasePublicId
        : false,
    });

    if (!media) {
      return NextResponse.json(
        {
          error:
            "Avatar upload is not verified, is already attached, or does not belong to this account.",
        },
        { status: 403 }
      );
    }

    // Update profile and consume media authorization atomically.
    const updated = await prisma.$transaction(async (tx) => {
      const linked = await tx.mediaAsset.updateMany({
        where: {
          id: media.id,
          ownerUserId: user.id,
          publicId: databasePublicId,
          context: "avatar",
          resourceType: "image",
          secureUrl: image,
          linkedAt: null,
        },
        data: {
          linkedAt: new Date(),
        },
      });

      if (linked.count !== 1) {
        throw new Error("MEDIA_ALREADY_LINKED");
      }

      const result = await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          image,
        },
        select: {
          image: true,
        },
      });

      return result;
    });

    console.info("[Avatar] Profile image updated successfully:", {
      userId: user.id,
      databasePublicId,
    });

    return NextResponse.json({
      ok: true,
      image: updated.image,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "MEDIA_ALREADY_LINKED"
    ) {
      return NextResponse.json(
        {
          error: "Avatar upload was already attached. Upload again.",
        },
        { status: 409 }
      );
    }

    console.error("[Avatar] Update error:", error);

    return NextResponse.json(
      { error: "Unable to update profile avatar." },
      { status: 500 }
    );
  }
}
