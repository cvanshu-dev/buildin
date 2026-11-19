
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AccountRole = "BRAND" | "CREATOR";

export function OnboardingForm() {
  const [role, setRole] = useState<AccountRole>("BRAND");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    brandName: "",
    website: "",
    industry: "",
    description: "",
    displayName: "",
    bio: "",
    city: "",
    state: "",
    address: "",
    contactName: "",
    contactEmail: "",
    phone: "",
    gstin: "",
    categories: "",
    specialties: "",
    languages: "",
  });

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function toArray(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function submit() {
    setLoading(true);
    setError("");

    const payload =
      role === "BRAND"
        ? {
            role,
            brandName: form.brandName,
            website: form.website,
            industry: form.industry,
            description: form.description,
            city: form.city,
            state: form.state,
            address: form.address,
            contactName: form.contactName,
            contactEmail: form.contactEmail,
            phone: form.phone,
            gstin: form.gstin,
          }
        : {
            role,
            displayName: form.displayName,
            bio: form.bio,
            city: form.city,
            state: form.state,
            categories: toArray(form.categories),
            specialties: toArray(form.specialties),
            languages: toArray(form.languages),
          };

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to save your account details."
        );
      }

      router.replace(data.redirectTo);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-300";

  const labelClass = "block text-sm font-medium text-zinc-300";

  return (
    <div className="mt-10 space-y-6">
      {/* Account type */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            value: "BRAND" as const,
            title: "I'm a brand",
            detail: "Find talent and run marketing campaigns.",
          },
          {
            value: "CREATOR" as const,
            title: "I'm a creator",
            detail: "Showcase your work and get brand collaborations.",
          },
        ].map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => {
              setRole(option.value);
              setError("");
            }}
            className={`rounded-2xl border p-5 text-left transition ${
              role === option.value
                ? "border-lime-300 bg-lime-300/10"
                : "border-white/10 bg-white/[.03] hover:border-white/30"
            }`}
          >
            <span className="font-semibold text-white">
              {option.title}
            </span>
            <span className="mt-2 block text-sm text-zinc-400">
              {option.detail}
            </span>
          </button>
        ))}
      </div>

      {/* Brand form */}
      {role === "BRAND" && (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-white">
            Brand information
          </h2>

          <div>
            <label className={labelClass}>Brand name *</label>
            <input
              className={inputClass}
              placeholder="Your company name"
              value={form.brandName}
              onChange={(e) => updateField("brandName", e.target.value)}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Website</label>
              <input
                className={inputClass}
                placeholder="https://example.com"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Industry</label>
              <input
                className={inputClass}
                placeholder="Fashion, technology, beauty..."
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={3}
              placeholder="Tell us about your brand"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>City *</label>
              <input
                className={inputClass}
                placeholder="Lucknow"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>State *</label>
              <input
                className={inputClass}
                placeholder="Uttar Pradesh"
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Business address</label>
            <input
              className={inputClass}
              placeholder="Full business address"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Contact person</label>
              <input
                className={inputClass}
                placeholder="Contact name"
                value={form.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Contact email</label>
              <input
                type="email"
                className={inputClass}
                placeholder="business@example.com"
                value={form.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phone</label>
              <input
                className={inputClass}
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>GSTIN</label>
              <input
                className={inputClass}
                placeholder="GST identification number"
                value={form.gstin}
                onChange={(e) => updateField("gstin", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Creator form */}
      {role === "CREATOR" && (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-white">
            Creator information
          </h2>

          <div>
            <label className={labelClass}>Display name *</label>
            <input
              className={inputClass}
              placeholder="Your public creator name"
              value={form.displayName}
              onChange={(e) => updateField("displayName", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              className={inputClass}
              rows={3}
              placeholder="Tell brands about yourself and your work"
              value={form.bio}
              onChange={(e) => updateField("bio", e.target.value)}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>City *</label>
              <input
                className={inputClass}
                placeholder="Lucknow"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>State *</label>
              <input
                className={inputClass}
                placeholder="Uttar Pradesh"
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Content categories</label>
            <input
              className={inputClass}
              placeholder="Fashion, Lifestyle, Travel"
              value={form.categories}
              onChange={(e) => updateField("categories", e.target.value)}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Separate multiple categories with commas.
            </p>
          </div>

          <div>
            <label className={labelClass}>Specialties</label>
            <input
              className={inputClass}
              placeholder="Modeling, UGC, Photography"
              value={form.specialties}
              onChange={(e) => updateField("specialties", e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Languages</label>
            <input
              className={inputClass}
              placeholder="English, Hindi"
              value={form.languages}
              onChange={(e) => updateField("languages", e.target.value)}
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={submit}
        className="w-full rounded-full bg-lime-300 px-6 py-4 font-semibold text-black transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Saving your details..." : "Complete onboarding"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Fields marked with * are required.
      </p>
    </div>
  );
}
