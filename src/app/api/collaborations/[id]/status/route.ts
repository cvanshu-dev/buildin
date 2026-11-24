import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const campaign = await prisma.campaign.findFirst({ where: { id, brand: { members: { some: { userId: user.id } } } }, select: { id: true, milestones: { orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }] } } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  return NextResponse.json({ milestones: campaign.milestones });
}
