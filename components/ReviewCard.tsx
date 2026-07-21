"use client";

import { useState } from "react";

type Review = {
  id: string;
  productTitle: string;
  rating: number;
  body: string;
  customerName: string;
  photoUrl: string | null;
};

const TEMPLATES = [
  { value: "quote-minimal", label: "Minimal (white)" },
  { value: "story-bold", label: "Bold (dark)" },
];
const FORMATS = [
  { value: "post", label: "Square post (1080×1080)" },
  { value: "story", label: "Story (1080×1920)" },
];

export function ReviewCard({
  shop,
  review,
  pending,
}: {
  shop: string;
  review: Review;
  pending: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [template, setTemplate] = useState(TEMPLATES[0].value);
  const [format, setFormat] = useState(FORMATS[0].value);

  async function moderate(action: "approve" | "reject") {
    setBusy(true);
    try {
      await fetch("/api/reviews/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, reviewId: review.id, action }),
      });
      setRemoved(true);
    } finally {
      setBusy(false);
    }
  }

  if (removed) return null;

  const imageUrl = `/api/ugc/generate?reviewId=${review.id}&template=${template}&format=${format}`;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-2 flex items-center gap-1 text-yellow-400">
        {"★".repeat(review.rating)}
        {"☆".repeat(5 - review.rating)}
      </div>
      <p className="mb-2 text-sm text-white/80 leading-relaxed">{review.body}</p>
      <p className="mb-4 text-xs text-white/40">
        {review.customerName} · {review.productTitle}
      </p>

      {pending ? (
        <div className="flex gap-2">
          <button
            onClick={() => moderate("approve")}
            disabled={busy}
            className="rounded-md bg-emerald-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-emerald-300 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            onClick={() => moderate("reject")}
            disabled={busy}
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex gap-2">
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-white"
            >
              {TEMPLATES.map((t) => (
                <option key={t.value} value={t.value} style={{ color: "#000" }}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-white"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value} style={{ color: "#000" }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <img
            src={imageUrl}
            alt="UGC preview"
            className="w-full max-w-[220px] rounded-md border border-white/10"
          />
          <div className="flex gap-2">
            <a
              href={imageUrl}
              download={`review-${review.id}.png`}
              className="inline-block rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
            >
              Download image
            </a>
            <button
              onClick={() => moderate("reject")}
              disabled={busy}
              className="inline-block rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-60"
            >
              Delete review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
