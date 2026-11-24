
"use client";

import { useCallback, useEffect, useState } from "react";
import { MediaUploader } from "@/components/media-uploader";

type PortfolioItem = {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: string;
};

type SocialAccount = {
  id: string;
  platform: string;
  handle: string;
};

type VerificationItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  reviewedAt: string | null;
};

type ProfileData = {
  id?: string;
  name?: string;
  displayName?: string;
  logoUrl?: string | null;
  user?: { image: string | null };
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  address?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  gstin?: string | null;
  categories?: string[];
  specialties?: string[];
  languages?: string[];
  portfolioItems?: PortfolioItem[];
  socialAccounts?: SocialAccount[];
};

type ProfileResponse = {
  profile: ProfileData | null;
  error?: string;
};

type VerificationResponse = {
  item: VerificationItem | null;
  error?: string;
};

type FormValues = Record<string, string>;

export function ProfileWorkspace({
  type,
}: {
  type: "CREATOR" | "BRAND";
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [verification, setVerification] =
    useState<VerificationItem | null>(null);

  const [form, setForm] = useState<FormValues>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [portfolioMediaType, setPortfolioMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [platform, setPlatform] = useState("INSTAGRAM");
  const [handle, setHandle] = useState("");

  // Load profile and latest verification status.
  const load = useCallback(async () => {
    try {
      const [profileResponse, verificationResponse] = await Promise.all([
        fetch("/api/profile", { cache: "no-store" }),
        fetch("/api/verification", { cache: "no-store" }),
      ]);

      const profileData =
        (await profileResponse.json()) as ProfileResponse;

      const verificationData =
        (await verificationResponse.json()) as VerificationResponse;

      if (!profileResponse.ok) {
        throw new Error(
          profileData.error ?? "Unable to load profile."
        );
      }

      if (!verificationResponse.ok) {
        throw new Error(
          verificationData.error ??
            "Unable to load verification status."
        );
      }

      const current = profileData.profile;

      setProfile(current);
      setVerification(verificationData.item ?? null);

      if (!current) return;

      if (type === "CREATOR") {
        setForm({
          displayName: current.displayName ?? "",
          bio: current.bio ?? "",
          city: current.city ?? "",
          state: current.state ?? "",
          categories: (current.categories ?? []).join(", "),
          specialties: (current.specialties ?? []).join(", "),
          languages: (current.languages ?? []).join(", "),
        });
      } else {
        setForm({
          name: current.name ?? "",
          website: current.website ?? "",
          industry: current.industry ?? "",
          description: current.description ?? "",
          city: current.city ?? "",
          state: current.state ?? "",
          address: current.address ?? "",
          contactName: current.contactName ?? "",
          contactEmail: current.contactEmail ?? "",
          phone: current.phone ?? "",
          gstin: current.gstin ?? "",
        });
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load dashboard data."
      );
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = (key: string, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const input = (key: string, label: string) => (
    <label
      key={key}
      className="block text-sm text-slate-600"
    >
      {label}
      <input
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900"
        value={form[key] ?? ""}
        onChange={(event) =>
          updateField(key, event.target.value)
        }
      />
    </label>
  );

  // Save profile.
  async function save() {
    setBusy(true);
    setMessage("");

    const split = (value: string) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const body =
      type === "CREATOR"
        ? {
            ...form,
            categories: split(form.categories ?? ""),
            specialties: split(form.specialties ?? ""),
            languages: split(form.languages ?? ""),
          }
        : form;

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Save failed.");
      }

      setMessage("Profile saved.");
      await load();
      if (type === "CREATOR") window.dispatchEvent(new Event("creator-profile-updated"));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Save failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // Add portfolio item.
  async function addPortfolio() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          mediaUrl: url,
          mediaType: portfolioMediaType,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to add portfolio item."
        );
      }

      setTitle("");
      setUrl("");
      setPortfolioMediaType("IMAGE");
      setMessage("Portfolio item added.");

      await load();
      window.dispatchEvent(new Event("creator-profile-updated"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to add portfolio item."
      );
    } finally {
      setBusy(false);
    }
  }

  // Add social account.
  async function addSocial() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/social-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          handle,
          profileUrl: url,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to save social account."
        );
      }

      setHandle("");
      setUrl("");
      setMessage("Social account saved.");

      await load();
      window.dispatchEvent(new Event("creator-profile-updated"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save social account."
      );
    } finally {
      setBusy(false);
    }
  }

  // Submit or resubmit verification.
  async function requestVerification() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as {
        error?: string;
        item?: VerificationItem;
      };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to submit verification request."
        );
      }

      if (data.item) {
        setVerification(data.item);
      } else {
        await load();
      }

      setMessage("Verification request submitted.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit verification request."
      );

      // Refresh in case the server already has a pending request.
      await load();
    } finally {
      setBusy(false);
    }
  }

  const panel =
    "rounded-2xl border border-slate-200 bg-white p-5";

  if (!profile) {
    return (
      <p className="mt-8 text-sm text-slate-600">
        {message || "Loading profile…"}
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section className={panel}>
        <h2 className="mb-2 text-lg font-semibold">{type === "CREATOR" ? "Profile picture" : "Brand logo"}</h2>
        <p className="mb-4 text-sm text-slate-600">Upload manually or connect a professional Instagram account through Meta to sync its profile picture.</p>
        <div className="flex flex-wrap items-center gap-4">
          {(type === "CREATOR" ? profile.user?.image : profile.logoUrl) ? <img src={(type === "CREATOR" ? profile.user?.image : profile.logoUrl) ?? ""} alt="Profile" className="h-20 w-20 rounded-full border border-slate-200 object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-500">{(profile.displayName ?? profile.name ?? "B").slice(0,1).toUpperCase()}</div>}
          <MediaUploader context={type === "CREATOR" ? "avatar" : "brand-logo"} accept="image/jpeg,image/png,image/webp" maxSizeMb={8} onUpload={async (asset) => {
            if (type === "CREATOR") {
              const response = await fetch("/api/profile/avatar", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: asset.secure_url }) });
              const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not save profile picture.");
            } else {
              const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, logoUrl: asset.secure_url }) });
              const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not save brand logo.");
            }
            await load();
          }} />
        </div>
      </section>

      {/* Profile details */}
      <section className={panel}>
        <h2 className="mb-5 text-lg font-semibold">
          Profile details
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          {type === "CREATOR" ? (
            <>
              {input("displayName", "Display name")}
              {input("city", "City")}
              {input("state", "State")}
              {input("bio", "Bio")}
              {input("categories", "Categories (comma separated)")}
              {input("specialties", "Specialties (comma separated)")}
              {input("languages", "Languages (comma separated)")}
            </>
          ) : (
            <>
              {input("name", "Brand name")}
              {input("website", "Website")}
              {input("industry", "Industry")}
              {input("description", "Description")}
              {input("city", "City")}
              {input("state", "State")}
              {input("address", "Address")}
              {input("contactName", "Contact name")}
              {input("contactEmail", "Contact email")}
              {input("phone", "Phone")}
              {input("gstin", "GSTIN")}
            </>
          )}
        </div>

        <button
          disabled={busy}
          onClick={save}
          className="mt-5 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save profile
        </button>
      </section>

      {/* Creator portfolio and social accounts */}
      {type === "CREATOR" && (
        <>
          <section className={panel}>
            <h2 className="font-semibold">Portfolio</h2>

            <p className="mt-1 text-xs text-slate-600">Upload images or videos directly to your portfolio, or paste a hosted media URL.</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                className="rounded-xl bg-slate-50 p-3"
                placeholder="Project title"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
              />

              <input className="rounded-xl bg-slate-50 p-3" placeholder="Public media URL (optional if uploaded)" value={url} onChange={(event) => setUrl(event.target.value)} />
              <div className="md:col-span-2"><MediaUploader context="portfolio" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" maxSizeMb={100} onUpload={(asset) => { setUrl(asset.secure_url); setPortfolioMediaType(asset.resource_type === "video" ? "VIDEO" : "IMAGE"); }} /></div>
            </div>

            <button
              disabled={busy || !title.trim() || !url.trim()}
              onClick={addPortfolio}
              className="mt-3 rounded-full border border-white/20 px-5 py-2 text-sm disabled:opacity-50"
            >
              Add item
            </button>

            <ul className="mt-4 space-y-2">
              {(profile.portfolioItems ?? []).map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between rounded-lg border border-slate-200 p-3 text-sm"
                >
                  {item.title}

                  <a
                    href={item.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Social accounts</h2><div className="flex gap-2"><a href="/api/integrations/instagram/start" className="rounded-full bg-pink-600 px-4 py-2 text-xs font-semibold text-white">Connect Instagram</a>{profile.socialAccounts?.some(a=>a.platform==="INSTAGRAM"&&a.source==="INSTAGRAM_OAUTH")&&<button type="button" onClick={async()=>{setBusy(true);try{const r=await fetch("/api/integrations/instagram/refresh",{method:"POST"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Refresh failed.");setMessage("Instagram connection refreshed.");await load();}catch(e){setMessage(e instanceof Error?e.message:"Refresh failed.");}finally{setBusy(false);}}} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold">Refresh connection</button>}</div></div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select
                className="rounded-xl bg-zinc-900 p-3"
                value={platform}
                onChange={(event) =>
                  setPlatform(event.target.value)
                }
              >
                {[
                  "INSTAGRAM",
                  "YOUTUBE",
                  "TIKTOK",
                  "FACEBOOK",
                  "X",
                  "LINKEDIN",
                  "TWITCH",
                  "OTHER",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <input
                className="rounded-xl bg-slate-50 p-3"
                placeholder="@handle"
                value={handle}
                onChange={(event) =>
                  setHandle(event.target.value)
                }
              />

              <input
                className="rounded-xl bg-slate-50 p-3"
                placeholder="Profile URL"
                value={url}
                onChange={(event) =>
                  setUrl(event.target.value)
                }
              />
            </div>

            <button
              onClick={addSocial}
              disabled={busy}
              className="mt-3 rounded-full border border-white/20 px-5 py-2 text-sm disabled:opacity-50"
            >
              Save account
            </button>

            <ul className="mt-4 space-y-2">
              {(profile.socialAccounts ?? []).map((account) => (
                <li
                  key={account.id}
                  className="rounded-lg border border-slate-200 p-3 text-sm"
                >
                  {account.platform} · {account.handle}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* Verification */}
      <section className={panel}>
        <h2 className="font-semibold">Verification</h2>

        {verification?.status === "APPROVED" ? (
          <div className="mt-3">
            <p className="font-medium text-green-400">
              ✓ Your {type === "BRAND" ? "brand" : "creator"} is verified
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Your verification request has been approved.
            </p>

            {verification.reviewedAt && (
              <p className="mt-2 text-xs text-slate-500">
                Approved on{" "}
                {new Date(
                  verification.reviewedAt
                ).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : verification?.status === "PENDING" ? (
          <div className="mt-3">
            <p className="font-medium text-yellow-400">
              Verification pending
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Your profile is currently under manual review.
            </p>
          </div>
        ) : (
          <div className="mt-3">
            {verification?.status === "REJECTED" && (
              <div className="mb-3">
                <p className="font-medium text-red-400">
                  Verification rejected
                </p>

                {verification.reviewNote && (
                  <p className="mt-1 text-sm text-slate-600">
                    Reason: {verification.reviewNote}
                  </p>
                )}
              </div>
            )}

            <p className="text-sm text-slate-600">
              Submit your profile for manual review. Do not upload
              passwords or payment details.
            </p>

            <button
              disabled={busy}
              onClick={requestVerification}
              className="mt-3 rounded-full border border-lime-300/40 px-5 py-2 text-sm text-blue-700 disabled:opacity-50"
            >
              {verification?.status === "REJECTED"
                ? "Resubmit verification"
                : "Request verification"}
            </button>
          </div>
        )}
      </section>

      {message && (
        <p role="status" className="text-sm text-slate-700">
          {message}
        </p>
      )}
    </div>
  );
}
