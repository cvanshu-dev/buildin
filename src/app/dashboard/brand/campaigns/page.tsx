"use client";

import { useEffect, useState } from "react";
import { MediaUploader } from "@/components/media-uploader";

type Campaign = { id: string; title: string; status: string; brief: string; _count?: { applications: number } };
type BriefAttachment = { id: string; fileName: string; url: string; bytes: number; createdAt: string };

export default function BrandCampaigns() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [form, setForm] = useState({ title: "", brief: "", categories: "", platforms: "", budgetMin: "", budgetMax: "", slots: "1", coverImageUrl: "", coverImagePublicId: "" });
  const [message, setMessage] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [attachments, setAttachments] = useState<BriefAttachment[]>([]);

  async function load() {
    const response = await fetch("/api/campaigns");
    const data = await response.json();
    if (response.ok) setItems(data.campaigns || []);
    else setMessage(data.error || "Could not load campaigns.");
  }

  async function loadAttachments(campaignId: string) {
    const response = await fetch(`/api/campaigns/${campaignId}/attachments`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load campaign files.");
    setAttachments(data.attachments || []);
  }

  useEffect(() => { void load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const body = {
      title: form.title, brief: form.brief, coverImageUrl: form.coverImageUrl || null, coverImagePublicId: form.coverImagePublicId || undefined,
      categories: form.categories.split(",").map((value) => value.trim()).filter(Boolean),
      platforms: form.platforms.split(",").map((value) => value.trim()).filter(Boolean),
      budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
      budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
      slots: Number(form.slots), status: "DRAFT",
    };
    const response = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    setMessage(response.ok ? "Draft campaign created." : data.error || "Unable to create campaign.");
    if (response.ok) {
      setForm({ title: "", brief: "", categories: "", platforms: "", budgetMin: "", budgetMax: "", slots: "1", coverImageUrl: "", coverImagePublicId: "" });
      if (data.campaign?.id) {
        setSelectedCampaignId(data.campaign.id);
        await loadAttachments(data.campaign.id);
      }
      await load();
    }
  }

  async function addAttachment(asset: { secure_url: string; public_id: string; resource_type: string; bytes: number; original_filename?: string }) {
    if (!selectedCampaignId) return;
    const response = await fetch(`/api/campaigns/${selectedCampaignId}/attachments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: asset.original_filename || "Campaign brief file",
        url: asset.secure_url, publicId: asset.public_id,
        resourceType: asset.resource_type, bytes: asset.bytes,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to attach file to campaign.");
    await loadAttachments(selectedCampaignId);
  }

  async function removeAttachment(attachmentId: string) {
    if (!selectedCampaignId) return;
    const response = await fetch(`/api/campaigns/${selectedCampaignId}/attachments?attachmentId=${encodeURIComponent(attachmentId)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Unable to remove attachment."); return; }
    await loadAttachments(selectedCampaignId);
  }

  return (
    <main className="mt-8 grid gap-8 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 p-5">
        <h2 className="text-xl font-semibold">Create campaign</h2>
        <form onSubmit={create} className="mt-5 space-y-3">
          <div>
            <p className="mb-2 text-sm text-slate-600">Campaign cover image</p>
            <MediaUploader context="campaign-cover" accept="image/jpeg,image/png,image/webp" maxSizeMb={8} onUpload={(asset) => setForm((value) => ({ ...value, coverImageUrl: asset.secure_url, coverImagePublicId: asset.public_id }))} />
            {form.coverImageUrl && <img src={form.coverImageUrl} alt="Campaign cover preview" className="mt-3 h-36 w-full rounded-xl object-cover" />}
          </div>
          {(["title", "brief", "categories", "platforms", "budgetMin", "budgetMax", "slots"] as const).map((key) => (
            <label key={key} className="block text-sm text-slate-600">
              {({ title: "Campaign title", brief: "Campaign brief (minimum 30 characters)", categories: "Categories (comma separated)", platforms: "Platforms (comma separated)", budgetMin: "Minimum budget (INR)", budgetMax: "Maximum budget (INR)", slots: "Creator slots" })[key]}
              {key === "brief"
                ? <textarea required minLength={30} className="mt-1 w-full rounded-xl bg-slate-50 p-3" rows={5} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
                : <input required={["title", "categories"].includes(key)} type={["budgetMin", "budgetMax", "slots"].includes(key) ? "number" : "text"} className="mt-1 w-full rounded-xl bg-slate-50 p-3" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />}
            </label>
          ))}
          <button className="rounded-full bg-blue-600 px-5 py-3 font-semibold text-white">Save draft</button>
        </form>
        {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Your campaigns</h2>
        <div className="mt-4 space-y-3">
          {items.map((campaign) => (
            <article key={campaign.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex justify-between gap-3"><h3 className="font-semibold">{campaign.title}</h3><span className="text-xs text-slate-600">{campaign.status}</span></div>
              <p className="mt-2 text-sm text-slate-600">{campaign._count?.applications ?? 0} applications</p>
              <p className="mt-2 line-clamp-2 text-sm">{campaign.brief}</p>
              <button type="button" onClick={async () => { setSelectedCampaignId(campaign.id); try { await loadAttachments(campaign.id); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load files."); } }} className="mt-3 text-sm font-medium text-blue-700 underline">Manage brief attachments</button>
            </article>
          ))}
        </div>
        {selectedCampaignId && (
          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Campaign brief files</h3><button type="button" onClick={() => { setSelectedCampaignId(""); setAttachments([]); }} className="text-xs text-slate-500 underline">Close</button></div>
            <div className="mt-3"><MediaUploader context="campaign-brief" campaignId={selectedCampaignId} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,image/jpeg,image/png,image/webp" maxSizeMb={25} multiple maxFiles={20} onUpload={addAttachment} /></div>
            <ul className="mt-4 space-y-2">
              {attachments.map((attachment) => <li key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><a href={attachment.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-blue-700 underline">{attachment.fileName}</a><button type="button" onClick={() => void removeAttachment(attachment.id)} className="shrink-0 text-xs text-red-600">Remove</button></li>)}
              {attachments.length === 0 && <li className="text-xs text-slate-500">No brief files uploaded yet.</li>}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
