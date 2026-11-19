"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleSignOut} disabled={loading} className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-50">
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
