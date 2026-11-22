import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().trim().min(4).max(120).optional(),
  brief: z.string().trim().min(30).max(5000).optional(),
  objectives: z.array(z.string().trim().min(2).max(100)).max(10).optional(),
  categories: z.array(z.string().trim().min(1).max(50)).min(1).max(12).optional(),
  platforms: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
  location: z.string().trim().max(100).nullable().optional(),
  budgetMin: z.number().int().min(0).nullable().optional(),
  budgetMax: z.number().int().min(0).nullable().optional(),
  slots: z.number().int().min(1).max(100).optional(),
  applicationDeadline: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "PAUSED", "CLOSED"]).optional(),
});
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "BRAND") return NextResponse.json({ error: "Brand account required." }, { status: 403 });
  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  const campaign = await prisma.campaign.findFirst({ where: { id, brand: { members: { some: { userId: user.id, title: "Owner" } } } } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  const d = parsed.data;
  if (d.budgetMin != null && d.budgetMax != null && d.budgetMax < d.budgetMin) return NextResponse.json({ error: "Maximum budget must be greater than minimum." }, { status: 400 });
  const updated = await prisma.campaign.update({ where: { id }, data: {
    ...d,
    ...(d.applicationDeadline !== undefined ? { applicationDeadline: d.applicationDeadline ? new Date(d.applicationDeadline) : null } : {}),
    ...(d.startDate !== undefined ? { startDate: d.startDate ? new Date(d.startDate) : null } : {}),
    ...(d.endDate !== undefined ? { endDate: d.endDate ? new Date(d.endDate) : null } : {}),
  } });
  return NextResponse.json({ campaign: updated });
}
