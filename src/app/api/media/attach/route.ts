import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  publicIds: z.array(z.string().min(1).max(240)).min(1).max(30).refine((ids) => new Set(ids).size === ids.length, "Duplicate media references are not allowed."),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid media references." }, { status: 400 });

  const publicIds = parsed.data.publicIds;
  const assets = await prisma.mediaAsset.findMany({
    where: {
      ownerUserId: user.id,
      publicId: { in: publicIds },
      secureUrl: { startsWith: "https://res.cloudinary.com/" },
      bytes: { gt: 0 },
      format: { not: "pending" },
    },
    select: { publicId: true },
  });

  if (assets.length !== publicIds.length) {
    return NextResponse.json({ error: "One or more assets are not owned by this account or have not passed server verification." }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.mediaAsset.updateMany({
      where: { ownerUserId: user.id, publicId: { in: publicIds } },
      data: { linkedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true, linked: assets.length });
}
