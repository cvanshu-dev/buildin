import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const schema = z.object({ publicId: z.string().min(1).max(240), resourceType: z.enum(["image", "video", "raw"]) });

function signature(params: Record<string, string>, secret: string) {
  const value = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  return createHash("sha1").update(value + secret).digest("hex");
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid media deletion request." }, { status: 400 });

  const { publicId, resourceType } = parsed.data;
  const creator = user.role === "CREATOR" ? await prisma.creatorProfile.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
  const brand = user.role === "BRAND" ? await prisma.brandMember.findFirst({ where: { userId: user.id, title: "Owner" }, select: { brandId: true } }) : null;
  const prefixes = [
    ...(creator ? [`buildin/creators/${user.id}/`] : []),
    ...(brand ? [`buildin/brands/${brand.brandId}/`] : []),
  ];
  if (user.role === "CREATOR") {
    const collaborations = await prisma.collaboration.findMany({ where: { creatorProfile: { userId: user.id } }, select: { id: true } });
    prefixes.push(...collaborations.map((item) => `buildin/collaborations/${item.id}/`));
  }
  if (!prefixes.some((prefix) => publicId.startsWith(prefix))) return NextResponse.json({ error: "You do not own this media asset." }, { status: 403 });

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });

  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { public_id: publicId, timestamp };
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("timestamp", timestamp);
  form.set("api_key", key);
  form.set("signature", signature(params, secret));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/destroy`, { method: "POST", body: form, cache: "no-store" });
  const result = await response.json() as { result?: string; error?: { message?: string } };
  if (!response.ok || !["ok", "not found"].includes(result.result ?? "")) return NextResponse.json({ error: result.error?.message ?? "Cloudinary could not delete this asset." }, { status: 502 });
  return NextResponse.json({ ok: true, result: result.result });
}
