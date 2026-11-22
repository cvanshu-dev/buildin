import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().trim().min(3).max(150),
  terms: z.string().trim().min(50).max(12000),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Agreement title and terms are required." }, { status: 400 });
  }

  const collab = await prisma.collaboration.findFirst({
    where: {
      id,
      campaign: { brand: { members: { some: { userId: user.id, title: "Owner" } } } },
    },
    select: { id: true, status: true },
  });
  if (!collab) {
    return NextResponse.json({ error: "Only the brand owner can draft agreement terms." }, { status: 403 });
  }
  if (collab.status !== "ACTIVE") {
    return NextResponse.json({ error: "Agreements cannot be changed on an inactive collaboration." }, { status: 409 });
  }

  const existing = await prisma.collaborationAgreement.findUnique({
    where: { collaborationId: id },
    select: { id: true, status: true },
  });
  if (existing && existing.status !== "DRAFT") {
    return NextResponse.json({
      error: "This agreement is no longer a draft and cannot be overwritten.",
    }, { status: 409 });
  }

  const agreement = await prisma.collaborationAgreement.upsert({
    where: { collaborationId: id },
    create: { collaborationId: id, ...parsed.data },
    update: { ...parsed.data },
  });
  return NextResponse.json({ agreement });
}
