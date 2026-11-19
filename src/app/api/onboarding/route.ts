import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { dashboardForRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const schema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("BRAND"),
    brandName: z.string().trim().min(2).max(100),
    website: optionalText(200),
    industry: optionalText(80),
    description: optionalText(1000),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    address: optionalText(240),
    contactName: optionalText(100),
    contactEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
    phone: optionalText(30),
    gstin: optionalText(15),
  }),
  z.object({
    role: z.literal("CREATOR"),
    displayName: z.string().trim().min(2).max(80),
    bio: optionalText(1000),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    categories: z.array(z.string().trim().min(1).max(50)).max(12).default([]),
    specialties: z.array(z.string().trim().min(1).max(50)).max(12).default([]),
    languages: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  }),
]);

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "brand";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "This account is not active." }, { status: 403 });
  if (user.role !== "PENDING" || user.onboardingDone) {
    return NextResponse.json({ error: "Account setup has already been completed." }, { status: 409 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid form data." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (parsed.data.role === "BRAND") {
        const data = parsed.data;
        const base = slugify(data.brandName);
        let slug = base;
        for (let suffix = 2; await tx.brand.findUnique({ where: { slug } }); suffix++) slug = `${base}-${suffix}`;
        await tx.brand.create({
          data: {
            name: data.brandName, slug, website: data.website || null, industry: data.industry || null,
            description: data.description || null, city: data.city, state: data.state,
            address: data.address || null, contactName: data.contactName || null,
            contactEmail: data.contactEmail || null, phone: data.phone || null, gstin: data.gstin || null,
            members: { create: { userId: user.id, title: "Owner" } },
          },
        });
      } else {
        const data = parsed.data;
        await tx.creatorProfile.create({ data: {
          userId: user.id, displayName: data.displayName, bio: data.bio || null,
          city: data.city, state: data.state, categories: data.categories,
          specialties: data.specialties, languages: data.languages,
        }});
      }
      return tx.user.update({
        where: { id: user.id },
        data: { role: parsed.data.role, onboardingDone: true },
        select: { role: true },
      });
    });
    return NextResponse.json({ ok: true, redirectTo: dashboardForRole(result.role) });
  } catch (error) {
    console.error("Onboarding failed", error);
    return NextResponse.json({ error: "We couldn't save your details. Please try again." }, { status: 500 });
  }
}