"use client";

import { useEffect, useState } from "react";

type Review = { id: string; rating: number; title: string | null; comment: string; createdAt: string; reviewer: { name: string; role: string }; collaboration: { campaign: { title: string } } };

export function BrandReviewsPanel({ brandId }: { brandId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(`/api/brands/${brandId}/reviews`, { cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load brand reviews.");
      if (active) { setReviews(data.reviews || []); setRating(data.rating); setCount(data.reviewCount || 0); }
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load brand reviews."); });
    return () => { active = false; };
  }, [brandId]);
  return <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Reputation</p><h2 className="mt-1 text-xl font-semibold">Creator feedback</h2></div><div className="text-right">{rating !== null ? <p className="text-2xl font-semibold"><span className="text-amber-300">★</span> {rating.toFixed(1)}<span className="text-sm text-white/40"> / 5</span></p> : <p className="text-sm text-white/50">No ratings yet</p>}<p className="text-xs text-white/40">{count} completed-collaboration reviews</p></div></div>
    {error && <p className="mt-3 text-sm text-rose-200">{error}</p>}
    <div className="mt-4 space-y-3">{reviews.length ? reviews.map(review => <article key={review.id} className="rounded-xl border border-white/10 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{review.reviewer.name} <span className="text-xs text-white/40">· Creator</span></p><p className="text-amber-300">{"★".repeat(review.rating)}<span className="text-white/20">{"★".repeat(5-review.rating)}</span></p></div>{review.title && <h3 className="mt-2 text-sm font-semibold">{review.title}</h3>}<p className="mt-1 whitespace-pre-wrap text-sm text-white/65">{review.comment}</p><p className="mt-2 text-xs text-white/35">{review.collaboration.campaign.title} · {new Date(review.createdAt).toLocaleDateString("en-IN")}</p></article>) : <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/45">Creator feedback from completed collaborations will appear here.</p>}</div>
  </section>;
}
