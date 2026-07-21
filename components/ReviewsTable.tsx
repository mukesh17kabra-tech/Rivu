"use client";

import { Fragment, useState } from "react";

type Review = {
  id: string;
  productId: string;
  productTitle: string;
  rating: number;
  body: string;
  customerName: string;
  customerEmail: string | null;
  approved: boolean;
  createdAt: Date;
};

const TEMPLATES = [
  { value: "quote-minimal", label: "Minimal (white)" },
  { value: "story-bold", label: "Bold (dark)" },
];
const FORMATS = [
  { value: "post", label: "Square post (1080×1080)" },
  { value: "story", label: "Story (1080×1920)" },
];

export function ReviewsTable({ shop, reviews: initial }: { shop: string; reviews: Review[] }) {
  const [reviews, setReviews] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ugcOpenId, setUgcOpenId] = useState<string | null>(null);
  const [template, setTemplate] = useState(TEMPLATES[0].value);
  const [format, setFormat] = useState(FORMATS[0].value);

  async function toggleApproved(review: Review) {
    setBusyId(review.id);
    try {
      await fetch("/api/reviews/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          reviewId: review.id,
          action: review.approved ? "unpublish" : "approve",
        }),
      });
      setReviews((rs) => rs.map((r) => (r.id === review.id ? { ...r, approved: !r.approved } : r)));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReview(review: Review) {
    setBusyId(review.id);
    try {
      await fetch("/api/reviews/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, reviewId: review.id, action: "reject" }),
      });
      setReviews((rs) => rs.filter((r) => r.id !== review.id));
    } finally {
      setBusyId(null);
    }
  }

  function toggleUgc(id: string) {
    setUgcOpenId((cur) => (cur === id ? null : id));
  }

  if (reviews.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-white/15 p-6 text-sm text-white/40">
        No reviews yet. Once shoppers submit reviews, they&apos;ll show up here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Reviewer</th>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Rating</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => {
            const imageUrl = `/api/ugc/generate?reviewId=${review.id}&template=${template}&format=${format}`;
            const ugcOpen = ugcOpenId === review.id;
            return (
              <Fragment key={review.id}>
                <tr className="border-t border-white/5 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{review.customerName}</p>
                    {review.customerEmail && (
                      <p className="text-xs text-white/40">{review.customerEmail}</p>
                    )}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-white/70">
                    <p className="truncate">{review.productTitle}</p>
                    <p className="mt-1 max-w-[220px] truncate text-xs text-white/40">{review.body}</p>
                  </td>
                  <td className="px-4 py-3 text-yellow-400 whitespace-nowrap">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        review.approved
                          ? "bg-emerald-400/20 text-emerald-300"
                          : "bg-yellow-400/20 text-yellow-300"
                      }`}
                    >
                      {review.approved ? "Published" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40 whitespace-nowrap">
                    {review.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => toggleApproved(review)}
                      disabled={busyId === review.id}
                      className="mr-3 text-xs font-medium text-emerald-400 hover:underline disabled:opacity-50"
                    >
                      {review.approved ? "Unpublish" : "Publish"}
                    </button>
                    {review.approved && (
                      <button
                        onClick={() => toggleUgc(review.id)}
                        className="mr-3 text-xs font-medium text-blue-400 hover:underline"
                      >
                        {ugcOpen ? "Hide graphic" : "Create graphic"}
                      </button>
                    )}
                    <button
                      onClick={() => deleteReview(review)}
                      disabled={busyId === review.id}
                      className="text-xs font-medium text-red-400 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {ugcOpen && (
                  <tr className="border-t border-white/5 bg-white/[0.015]">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="flex items-start gap-4">
                        <div className="space-y-2">
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
                            className="ml-2 rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-white"
                          >
                            {FORMATS.map((f) => (
                              <option key={f.value} value={f.value} style={{ color: "#000" }}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                          <div>
                            <a
                              href={imageUrl}
                              download={`review-${review.id}.png`}
                              className="inline-block rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                            >
                              Download image
                            </a>
                          </div>
                        </div>
                        <img
                          src={imageUrl}
                          alt="UGC preview"
                          className="w-full max-w-[200px] rounded-md border border-white/10"
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
