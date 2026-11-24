import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const creators = await prisma.creatorProfile.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, displayName: true, isPublic: true, city: true, state: true,
      user: { select: { name: true, email: true, status: true } },
      socialAccounts: {
        where: { platform: "INSTAGRAM" },
        select: {
          id: true, handle: true, profileUrl: true, followers: true, following: true, source: true,
          socialAccountMetricSnapshots: { orderBy: { recordedAt: "desc" }, take: 1 },
        },
      },
    },
  });
  return NextResponse.json({ creators });
}
