"use client";

import { useEffect, useMemo, useState } from "react";

type Profile = {
  id: string;
  displayName: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  categories: string[];
  specialties: string[];
  languages: string[];
  isPublic: boolean;
  portfolioItems: { id: string }[];
  socialAccounts: { id: string }[];
};

const checks = [
  { key: "displayName", label: "Display name" },
  { key: "bio", label: "Bio" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "categories", label: "At least one category" },
  { key: "specialties", label: "At least one specialty" },
  { key: "portfolioItems", label: "At least one portfolio item" },
  { key: "socialAccounts", label: "At least one social account" },
] as const;

export function CreatorProfileVisibility() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/profile", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.profile) {
      throw new Error(data.error ?? "Unable to load creator profile.");
    }
    setProfile(data.profile as Profile);
  }

  useEffect(() => {
    void load().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Unable to load profile.");
    });
  }, []);

  const completed = useMemo(() => {
    if (!profile) return [];
    return [
      Boolean(profile.displayName?.trim()),
      Boolean(profile.bio?.trim()),
      Boolean(profile.city?.trim()),
      Boolean(profile.state?.trim()),
      profile.categories.length > 0,
      profile.specialties.length > 0,
      profile.portfolioItems.length > 0,
      profile.socialAccounts.length > 0,
    ];
  }, [profile]);

  const percentage = completed.filter(Boolean).length / checks.length * 100;

  async function toggleVisibility() {
    if (!profile) return;
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.displayName ?? "",
          bio: profile.bio,
          city: profile.city,
          state: profile.state,
          categories: profile.categories,
          specialties: profile.specialties,
          languages: profile.languages,
          isPublic: !profile.isPublic,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to update visibility.");
      await load();
      setMessage(profile.isPublic ? "Your profile is now private." : "Your profile is now public.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update visibility.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return null;

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Profile completeness</h2>
          <p className="mt-1 text-sm text-zinc-400">Complete these details to make your profile more useful to brands.</p>
        </div>
        <p className="text-2xl font-semibold text-lime-300">{Math.round(percentage)}%</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-lime-300 transition-all" style={{ width: percentage + "%" }} />
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {checks.map((check, index) => (
          <li key={check.key} className="flex items-center gap-2 text-sm">
            <span className={completed[index] ? "text-lime-300" : "text-zinc-500"}>{completed[index] ? "✓" : "○"}</span>
            <span className={completed[index] ? "text-zinc-200" : "text-zinc-400"}>{check.label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-medium">Public profile</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {profile.isPublic ? "Anyone with your profile link can view your public creator information." : "Your profile is private and hidden from public visitors."}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={toggleVisibility}
            className="rounded-full border border-lime-300/40 px-5 py-2 text-sm text-lime-200 disabled:opacity-50"
          >
            {busy ? "Saving…" : profile.isPublic ? "Make profile private" : "Make profile public"}
          </button>
        </div>
        {profile.isPublic && (
          <a href={"/creators/" + profile.id} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-lime-300 underline underline-offset-4">
            Preview public profile
          </a>
        )}
        {message && <p role="status" className="mt-3 text-sm text-zinc-300">{message}</p>}
      </div>
    </section>
  );
}
