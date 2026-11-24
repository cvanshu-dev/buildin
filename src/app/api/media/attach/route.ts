import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({ publicIds: z.array(z.string().min(1).max(240)).min(1).max(30) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid media references." }, { status: 400 });

  const publicIds = [...new Set(parsed.data.publicIds)];
  if (publicIds.length !== parsed.data.publicIds.length) {
    return NextResponse.json({ error: "Duplicate media references are not allowed." }, { status: 400 });
  }

  const assets = await prisma.mediaAsset.findMany({
    where: { ownerUserId: user.id, publicId: { in: publicIds }, resourceType: { in: ["image", "video", "raw"] } },
    select: { id: true, publicId: true, linkedAt: true },
  });
  if (assets.length !== publicIds.length) {
    return NextResponse.json({ error: "One or more assets are not owned by this account or were not verified." }, { status: 403 });
  }

  const alreadyLinked = assets.filter((asset) => asset.linkedAt !== null);
  if (alreadyLinked.length) {
    return NextResponse.json({ error: "One or more assets have already been attached." }, { status: 409 });
  }

  const updated = await prisma.mediaAsset.updateMany({
    where: { ownerUserId: user.id, publicId: { in: publicIds }, linkedAt: null },
    data: { linkedAt: new Date() },
  });
  if (updated.count !== publicIds.length) {
    return NextResponse.json({ error: "Media references changed during attachment. Refresh and retry." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, linked: updated.count });
}
