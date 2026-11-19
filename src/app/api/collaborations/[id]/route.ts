import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const collaboration = await prisma.collaboration.findFirst({
    where: { id, OR: [
      { creatorProfile: { userId: user.id } },
      { campaign: { brand: { members: { some: { userId: user.id } } } } },
    ] },
    include: {
      campaign: { select: { id: true, title: true, brief: true, brand: { select: { name: true } } } },
      creatorProfile: { select: { id: true, displayName: true, userId: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 100, include: { sender: { select: { id: true, name: true } } } },
      deliverables: { orderBy: { createdAt: "asc" } },
      agreement: true,
    },
  });
  if (!collaboration) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  return NextResponse.json({ collaboration });
}
