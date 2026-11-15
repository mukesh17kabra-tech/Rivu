"use client";

import { Fragment, useState } from "react";
import { ShareButtons } from "@/components/ShareButtons";

type Review = {
  id: string;
  productId: string;
  productTitle: string;
  rating: number;
  reviewTitle: string | null;
  body: string;
  customerName: string;
  customerEmail: string | null;
  approved: boolean;
  createdAt: Date;
  ownerReply: string | null;
  pinnedAt: Date | string | null;
  helpfulCount: number;
  unhelpfulCount: number;
};

const TEMPLATES = [
  { value: "quote-minimal", label: "Minimal (white)" },
  { value: "story-bold", label: "Bold (dark)" },
  { value: "pastel-card", label: "Pastel card" },
  { value: "gradient-pop", label: "Gradient pop" },
  { value: "polaroid", label: "Polaroid style" },
  { value: "receipt", label: "Receipt style" },
  { value: "bordered-classic", label: "Bordered classic" },
  { value: "big-quote", label: "Big quote marks" },
];
const FORMATS = [
  { value: "post", label: "Square post (1080×1080)" },
  { value: "story", label: "Story (1080×1920)" },
];

const PLAN_TEMPLATE_COUNTS: Record<string, number> = {
  free: 1,
  pro: Infinity,
};

export function ReviewsTable({
  shop,
  reviews: initial,
  plan,
}: {
  shop: string;
  reviews: Review[];
  plan: string;
}) {
  const [reviews, setReviews] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ugcOpenId, setUgcOpenId] = useState<string | null>(null);
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [template, setTemplate] = useState(TEMPLATES[0].value);
  const [format, setFormat] = useState(FORMATS[0].value);

  const allowedTemplateCount = PLAN_TEMPLATE_COUNTS[plan] ?? 1;

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

  /**
   * Saves the merchant's public reply to a review.
   *
   * Answering a critical review well reassures the next shopper more than the
   * review itself worried them — which is why this is the feature merchants
   * ask for first. An empty reply clears it, so one can be withdrawn without
   * deleting the review.
   */
  // Takes the text explicitly rather than reading state: "Remove reply" sets
  // the draft empty and saves in the same handler, and a React state update is
  // not visible until the next render — so reading state here would have saved
  // the old text and left the reply in place.
  async function saveReply(review: Review, text: string) {
    setBusyId(review.id);
    try {
      const res = await fetch("/api/reviews/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          reviewId: review.id,
          action: "reply",
          reply: text,
        }),
      });
      if (!res.ok) return;
      const saved = text.trim();
      setReviews((rs) =>
        rs.map((r) => (r.id === review.id ? { ...r, ownerReply: saved || null } : r))
      );
      setReplyOpenId(null);
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Pins or unpins a review.
   *
   * Pinned reviews sit above every sort order on the storefront, so this is
   * how a merchant answers the question shoppers keep asking — put the review
   * that addresses it first, whatever order they choose.
   */
  async function togglePin(review: Review) {
    setBusyId(review.id);
    try {
      const pinning = !review.pinnedAt;
      const res = await fetch("/api/reviews/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          reviewId: review.id,
          action: pinning ? "pin" : "unpin",
        }),
      });
      if (!res.ok) return;
      setReviews((rs) =>
        rs.map((r) =>
          r.id === review.id ? { ...r, pinnedAt: pinning ? new Date() : null } : r
        )
      );
    } finally {
      setBusyId(null);
    }
  }

  function toggleReply(review: Review) {
    setReplyOpenId((cur) => (cur === review.id ? null : review.id));
    setReplyDraft(review.ownerReply || "");
  }

  function toggleUgc(id: string) {
    setUgcOpenId((cur) => (cur === id ? null : id));
  }

  if (reviews.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-black/[0.14] p-6 text-[15px] text-black/58">
        No reviews yet. Once shoppers submit reviews, they&apos;ll show up here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/[0.10]">
      <table className="w-full text-left text-[15px]">
        <thead className="bg-black/[0.03] text-black/62">
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
                <tr className="border-t border-black/[0.06] align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#111418]">{review.customerName}</p>
                    {review.customerEmail && (
                      <p className="text-[13px] text-black/58">{review.customerEmail}</p>
                    )}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-black/72">
                    <p className="truncate">{review.productTitle}</p>
                    {review.reviewTitle && (
                      <p className="mt-1 max-w-[220px] truncate text-[13px] font-medium italic text-black/68">
                        {review.reviewTitle}
                      </p>
                    )}
                    <p className="mt-1 max-w-[220px] truncate text-[13px] text-black/58">{review.body}</p>
                  </td>
                  <td className="px-4 py-3 text-yellow-400 whitespace-nowrap">
                    {/* Rounded: String.repeat truncates, so a 4.5 would draw
                        four filled and no empty stars. */}
                    {"★".repeat(Math.round(review.rating))}
                    {"☆".repeat(5 - Math.round(review.rating))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[13px] ${
                        review.approved
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {review.approved ? "Published" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-black/58 whitespace-nowrap">
                    {review.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => toggleApproved(review)}
                      disabled={busyId === review.id}
                      className="mr-3 text-[13px] font-medium text-emerald-700 hover:underline disabled:opacity-50"
                    >
                      {review.approved ? "Unpublish" : "Publish"}
                    </button>
                    {review.approved && (
                      <button
                        onClick={() => toggleUgc(review.id)}
                        className="mr-3 text-[13px] font-medium text-blue-400 hover:underline"
                      >
                        {ugcOpen ? "Hide graphic" : "Create graphic"}
                      </button>
                    )}
                    {review.approved && (
                      <button
                        onClick={() => togglePin(review)}
                        disabled={busyId === review.id}
                        className="mr-3 text-[13px] font-medium text-amber-700 hover:underline disabled:opacity-50"
                      >
                        {review.pinnedAt ? "Unpin" : "Pin to top"}
                      </button>
                    )}
                    <button
                      onClick={() => toggleReply(review)}
                      className="mr-3 text-[13px] font-medium text-black/68 hover:underline"
                    >
                      {review.ownerReply ? "Edit reply" : "Reply"}
                    </button>
                    <button
                      onClick={() => deleteReview(review)}
                      disabled={busyId === review.id}
                      className="text-[13px] font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {replyOpenId === review.id && (
                  <tr className="border-t border-black/[0.06] bg-black/[0.015]">
                    <td colSpan={6} className="px-4 py-4">
                      <label className="mb-1.5 block text-[13px] font-medium text-black/62">
                        Your public reply — shown under this review on your storefront
                      </label>
                      <textarea
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Thanks for the feedback — we've passed this on to our team."
                        className="w-full rounded-md border border-black/[0.14] bg-black/[0.055] px-3 py-2 text-[15px] text-[#111418]"
                      />
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() => saveReply(review, replyDraft)}
                          disabled={busyId === review.id}
                          className="rounded-md bg-[#111418] px-3.5 py-1.5 text-[13px] font-bold text-white hover:bg-[#2a2f35] disabled:opacity-60"
                        >
                          {busyId === review.id ? "Saving…" : "Save reply"}
                        </button>
                        <button
                          onClick={() => setReplyOpenId(null)}
                          className="text-[13px] font-medium text-black/60 hover:text-black/72"
                        >
                          Cancel
                        </button>
                        {review.ownerReply && (
                          <button
                            onClick={() => {
                              setReplyDraft("");
                              saveReply(review, "");
                            }}
                            disabled={busyId === review.id}
                            className="ml-auto text-[13px] font-medium text-red-600/80 hover:underline disabled:opacity-50"
                          >
                            Remove reply
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {ugcOpen && (
                  <tr className="border-t border-black/[0.06] bg-black/[0.015]">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="flex items-start gap-4">
                        <div className="space-y-2">
                          <select
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            className="rounded-md border border-black/[0.14] bg-black/[0.03] px-2 py-1 text-[13px] text-[#111418]"
                          >
                            {TEMPLATES.map((t, i) => {
                              const locked = i >= allowedTemplateCount;
                              return (
                                <option
                                  key={t.value}
                                  value={t.value}
                                  disabled={locked}
                                  style={{ color: locked ? "#999" : "#000" }}
                                >
                                  {locked ? `🔒 ${t.label} (upgrade to unlock)` : t.label}
                                </option>
                              );
                            })}
                          </select>
                          <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="ml-2 rounded-md border border-black/[0.14] bg-black/[0.03] px-2 py-1 text-[13px] text-[#111418]"
                          >
                            {FORMATS.map((f) => (
                              <option key={f.value} value={f.value} style={{ color: "#000" }}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                          {allowedTemplateCount < TEMPLATES.length && (
                            <p className="text-[12px] text-amber-700/80">
                              {TEMPLATES.length - allowedTemplateCount} more template
                              {TEMPLATES.length - allowedTemplateCount === 1 ? "" : "s"} available on
                              a higher plan.{" "}
                              <a href={`/dashboard/plans?shop=${shop}`} className="underline">
                                Upgrade
                              </a>
                            </p>
                          )}
                          <div>
                            <a
                              href={imageUrl}
                              download={`review-${review.id}.png`}
                              className="inline-block rounded-md bg-black/[0.07] px-3 py-1.5 text-[13px] font-medium text-[#111418] hover:bg-black/[0.12]"
                            >
                              Download image
                            </a>
                          </div>
                          <ShareButtons imageUrl={imageUrl} reviewId={review.id} />
                        </div>
                        <img
                          src={imageUrl}
                          alt="UGC preview"
                          className="w-full max-w-[320px] rounded-md border border-black/[0.10]"
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
