import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { dashboardForRole, isAccountType } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const schema = z.object({ role: z.string() });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isAccountType(parsed.data.role)) {
    return NextResponse.json({ error: "Choose a valid account type." }, { status: 400 });
  }

  if (user.role !== "PENDING") {
    return NextResponse.json({ error: "Account type has already been selected." }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: parsed.data.role, onboardingDone: true }
  });

  return NextResponse.json({ ok: true, redirectTo: dashboardForRole(updated.role) });
}
