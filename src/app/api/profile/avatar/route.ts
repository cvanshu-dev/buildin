import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { findOwnedVerifiedMedia, isCloudinarySecureUrl } from "@/lib/media-assets";

const schema = z.object({
  image: z.string().url().max(2048),
  publicId: z.string().min(1).max(240),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A verified profile image upload is required." }, { status: 400 });

  if (!isCloudinarySecureUrl(parsed.data.image) || !parsed.data.publicId.startsWith(`buildin/creators/${user.id}/avatar/`)) {
    return NextResponse.json({ error: "Profile pictures must use your verified Cloudinary avatar upload." }, { status: 400 });
  }

  const asset = await findOwnedVerifiedMedia({
    ownerUserId: user.id,
    publicId: parsed.data.publicId,
    context: "avatar",
    expectedPrefix: `buildin/creators/${user.id}/avatar/`,
  });
  if (!asset || asset.resourceType !== "image") {
    return NextResponse.json({ error: "This avatar upload is not verified or does not belong to your account." }, { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const linked = await tx.mediaAsset.updateMany({
      where: { ownerUserId: user.id, publicId: parsed.data.publicId, linkedAt: null },
      data: { linkedAt: new Date() },
    });
    if (linked.count !== 1) return null;
    return tx.user.update({ where: { id: user.id }, data: { image: parsed.data.image }, select: { image: true } });
  });

  if (!result) return NextResponse.json({ error: "This upload has already been used. Upload the image again." }, { status: 409 });
  return NextResponse.json({ ok: true, image: result.image });
}
