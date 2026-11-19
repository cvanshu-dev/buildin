import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({ body: z.string().trim().min(1).max(3000) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Message must be between 1 and 3000 characters." }, { status: 400 });
  }
  const member = await prisma.collaboration.findFirst({
    where: {
      id,
      OR: [
        { creatorProfile: { userId: user.id } },
        { campaign: { brand: { members: { some: { userId: user.id } } } } },
      ],
    },
    select: { id: true, status: true },
  });
  if (!member) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  if (member.status !== "ACTIVE") {
    return NextResponse.json({ error: "This collaboration is not active." }, { status: 409 });
  }
  const message = await prisma.collaborationMessage.create({
    data: { collaborationId: id, senderId: user.id, body: parsed.data.body },
    select: {
      id: true,
      body: true,
      createdAt: true,
      sender: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ message }, { status: 201 });
}
