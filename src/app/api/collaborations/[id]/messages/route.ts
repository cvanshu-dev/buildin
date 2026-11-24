import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const messageSchema = z.object({ body: z.string().trim().min(1).max(3000) });

async function getParticipant(id: string, userId: string) {
  return prisma.collaboration.findFirst({
    where: {
      id,
      OR: [
        { creatorProfile: { userId } },
        { campaign: { brand: { members: { some: { userId } } } } },
      ],
    },
    select: {
      id: true,
      status: true,
      creatorProfile: { select: { userId: true } },
      campaign: { select: { brand: { select: { members: { select: { userId: true } } } } } },
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const collaboration = await getParticipant(id, user.id);
  if (!collaboration) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });

  await prisma.collaborationMessage.updateMany({
    where: { collaborationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  const url = new URL(request.url);
  const before = url.searchParams.get("before");
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 60));
  const messages = await prisma.collaborationMessage.findMany({
    where: { collaborationId: id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    include: { sender: { select: { id: true, name: true } } },
  });
  const unreadCount = await prisma.collaborationMessage.count({
    where: { collaborationId: id, senderId: { not: user.id }, readAt: null },
  });
  return NextResponse.json({
    currentUserId: user.id,
    messages: messages.reverse(),
    unreadCount,
    hasMore: messages.length === take,
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message must be between 1 and 3000 characters." }, { status: 400 });

  const collaboration = await getParticipant(id, user.id);
  if (!collaboration) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  if (collaboration.status !== "ACTIVE") return NextResponse.json({ error: "Messaging is closed for this collaboration." }, { status: 409 });

  const message = await prisma.collaborationMessage.create({
    data: { collaborationId: id, senderId: user.id, body: parsed.data.body },
    include: { sender: { select: { id: true, name: true } } },
  });

  const recipientIds = collaboration.creatorProfile.userId === user.id
    ? collaboration.campaign.brand.members.map((member) => member.userId)
    : [collaboration.creatorProfile.userId];
  const uniqueRecipients = [...new Set(recipientIds)].filter((recipientId) => recipientId !== user.id);
  if (uniqueRecipients.length) {
    await prisma.notification.createMany({
      data: uniqueRecipients.map((userId) => ({
        userId,
        type: "COLLABORATION_MESSAGE",
        title: "New collaboration message",
        body: `${user.name} sent you a message.`,
        href: `/dashboard/${user.role.toLowerCase()}/collaborations/${id}`,
      })),
    });
  }

  return NextResponse.json({ message }, { status: 201 });
}
