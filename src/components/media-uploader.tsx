"use client";

import { useRef, useState } from "react";

type UploadContext = "avatar" | "brand-logo" | "portfolio" | "campaign-cover" | "campaign-brief" | "deliverable";
type Asset = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  bytes: number;
  format: string;
  original_filename?: string;
};

export function MediaUploader({
  context, collaborationId, campaignId, accept, maxSizeMb, multiple = false, maxFiles = 10, onUpload,
}: {
  context: UploadContext;
  collaborationId?: string;
  campaignId?: string;
  accept: string;
  maxSizeMb: number;
  multiple?: boolean;
  maxFiles?: number;
  onUpload: (asset: Asset) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setDone("");
    const selected = Array.from(files);
    if (!multiple && selected.length > 1) { setError("Upload one file at a time."); return; }
    if (selected.length > maxFiles) { setError(`Select no more than ${maxFiles} files at once.`); return; }
    if (selected.some((file) => file.size > maxSizeMb * 1024 * 1024)) {
      setError(`Each file must be smaller than ${maxSizeMb} MB.`);
      return;
    }
    const accepted = accept.split(",").map((item) => item.trim()).filter(Boolean);
    if (selected.some((file) => !accepted.some((rule) => rule.startsWith(".") ? file.name.toLowerCase().endsWith(rule.toLowerCase()) : file.type === rule))) {
      setError("One or more selected files have an unsupported file type.");
      return;
    }

    setBusy(true);
    try {
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        const signResponse = await fetch("/api/media/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context, collaborationId, campaignId }),
        });
        const signed = await signResponse.json();
        if (!signResponse.ok) throw new Error(signed.error ?? "Unable to authorize upload.");

        const body = new FormData();
        body.append("file", file);
        body.append("api_key", signed.apiKey);
        body.append("timestamp", String(signed.timestamp));
        body.append("folder", signed.folder);
        body.append("public_id", signed.publicId);
        body.append("allowed_formats", signed.allowedFormats);
        body.append("signature", signed.signature);

        const uploaded = await new Promise<{ public_id: string; resource_type: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const fileProgress = Math.round((event.loaded / event.total) * 100);
              setProgress(Math.round(((index + fileProgress / 100) / selected.length) * 100));
            }
          };
          xhr.onerror = () => reject(new Error("Network error while uploading to Cloudinary."));
          xhr.onload = () => {
            const data = JSON.parse(xhr.responseText || "{}") as { public_id?: string; resource_type?: string; error?: { message?: string } };
            if (xhr.status < 200 || xhr.status >= 300 || !data.public_id || !data.resource_type) {
              reject(new Error(data.error?.message ?? "Cloudinary upload failed."));
            } else resolve({ public_id: data.public_id, resource_type: data.resource_type });
          };
          xhr.send(body);
        });

        const verifyResponse = await fetch("/api/media/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context, collaborationId, campaignId,
            publicId: uploaded.public_id, resourceType: uploaded.resource_type,
          }),
        });
        const verified = await verifyResponse.json();
        if (!verifyResponse.ok) throw new Error(verified.error ?? "Uploaded file did not pass server validation.");

        await onUpload({
          secure_url: verified.resourceType === "image" ? verified.secureUrl.replace("/upload/", "/upload/f_auto,q_auto/") : verified.resourceType === "video" ? verified.secureUrl.replace("/upload/", "/upload/q_auto/") : verified.secureUrl,
          public_id: verified.publicId,
          resource_type: verified.resourceType,
          bytes: verified.bytes,
          format: verified.format,
          original_filename: file.name,
        });
      }
      setProgress(100);
      setDone(selected.length > 1 ? `${selected.length} files uploaded and verified.` : "Upload complete and verified.");
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(0), 1200);
    }
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} disabled={busy}
        onChange={(event) => void upload(event.target.files)}
        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-50" />
      <p className="text-xs text-slate-500">Maximum file size: {maxSizeMb} MB per file. Files upload directly to Cloudinary and are verified on the server.</p>
      {busy && <div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div><p className="text-xs text-blue-700">Uploading and verifying… {progress}%</p></div>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {done && <p role="status" className="text-xs text-green-700">{done}</p>}
    </div>
  );
}
