import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !apiSecret) return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orphaned = await prisma.mediaAsset.findMany({ where: { linkedAt: null, createdAt: { lt: cutoff } }, orderBy: { createdAt: "asc" }, take: 100 });
  let deleted = 0;
  let failed = 0;
  for (const asset of orphaned) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const params = { public_id: asset.publicId, timestamp };
    const signature = createHash("sha1").update(Object.keys(params).sort().map((name) => `${name}=${params[name as keyof typeof params]}`).join("&") + apiSecret).digest("hex");
    const resourceTypes = asset.resourceType === "auto" ? ["image", "video", "raw"] : [asset.resourceType];
    let removed = false;
    let hadRequestError = false;
    for (const resourceType of resourceTypes) {
      const form = new FormData();
      form.set("public_id", asset.publicId);
      form.set("timestamp", timestamp);
      form.set("api_key", key);
      form.set("signature", signature);
      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/destroy`, { method: "POST", body: form, cache: "no-store" });
        const result = await response.json() as { result?: string };
        if (!response.ok) { hadRequestError = true; break; }
        if (result.result === "ok") { removed = true; break; }
        if (result.result !== "not found") { hadRequestError = true; break; }
      } catch { hadRequestError = true; break; }
    }
    if (hadRequestError) { failed += 1; continue; }
    // "not found" across all resource types means the upload was never completed or was already removed.
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    deleted += 1;
    void removed;
  }
  return NextResponse.json({ scanned: orphaned.length, deleted, failed, cutoff: cutoff.toISOString() });
}
