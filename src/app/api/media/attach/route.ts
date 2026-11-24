import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  publicIds: z.array(z.string().min(1).max(240)).min(1).max(30),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid media references." }, { status: 400 });

  const publicIds = parsed.data.publicIds;
  if (new Set(publicIds).size !== publicIds.length) {
    return NextResponse.json({ error: "Duplicate media references are not allowed." }, { status: 400 });
  }

  try {
    const linkedCount = await prisma.$transaction(async (tx) => {
      const assets = await tx.mediaAsset.findMany({
        where: {
          ownerUserId: user.id,
          publicId: { in: publicIds },
          resourceType: { in: ["image", "video", "raw"] },
          linkedAt: null,
        },
        select: { id: true },
      });
      if (assets.length !== publicIds.length) throw new Error("MEDIA_NOT_AVAILABLE");

      const result = await tx.mediaAsset.updateMany({
        where: {
          ownerUserId: user.id,
          publicId: { in: publicIds },
          resourceType: { in: ["image", "video", "raw"] },
          linkedAt: null,
        },
        data: { linkedAt: new Date() },
      });
      if (result.count !== publicIds.length) throw new Error("MEDIA_CONFLICT");
      return result.count;
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ ok: true, linked: linkedCount });
  } catch (error) {
    if (error instanceof Error && error.message === "MEDIA_NOT_AVAILABLE") {
      return NextResponse.json({ error: "One or more assets are not owned by this account, were not verified, or are already attached." }, { status: 403 });
    }
    if (error instanceof Error && error.message === "MEDIA_CONFLICT") {
      return NextResponse.json({ error: "Media references changed during attachment. Refresh and retry." }, { status: 409 });
    }
    console.error("[Media] Attachment failed:", error);
    return NextResponse.json({ error: "Unable to attach media." }, { status: 500 });
  }
}
