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
  const result = await prisma.mediaAsset.updateMany({
    where: { ownerUserId: user.id, publicId: { in: parsed.data.publicIds } },
    data: { linkedAt: new Date() },
  });
  if (result.count !== parsed.data.publicIds.length) return NextResponse.json({ error: "One or more assets are not owned by this account or were not verified." }, { status: 403 });
  return NextResponse.json({ ok: true, linked: result.count });
}
