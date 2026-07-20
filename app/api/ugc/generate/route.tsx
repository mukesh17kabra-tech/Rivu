import { ImageResponse } from "@vercel/og";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Renders a review as a downloadable social-media graphic. Called like:
// /api/ugc/generate?reviewId=xxx&template=quote-minimal&format=story
//
// No AI image generation, no external design tool — just server-rendered
// HTML/CSS turned into a PNG via Satori (what @vercel/og wraps). Fully free,
// no per-image API cost.
export async function GET(req: NextRequest) {
  const reviewId = req.nextUrl.searchParams.get("reviewId");
  const template = req.nextUrl.searchParams.get("template") || "quote-minimal";
  const format = req.nextUrl.searchParams.get("format") || "post"; // "post" | "story"

  if (!reviewId) {
    return new Response("Missing reviewId", { status: 400 });
  }

  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    return new Response("Review not found", { status: 404 });
  }

  const size =
    format === "story" ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 };

  const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);

  // Two starter templates. More can be added the same way — just another
  // branch returning different JSX/styling. Kept plain inline styles since
  // Satori (what @vercel/og uses) only supports a subset of CSS.
  if (template === "story-bold") {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
            padding: "80px",
            color: "white",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 40, color: "#facc15", display: "flex" }}>
            {stars}
          </div>
          <div
            style={{
              fontSize: 56,
              lineHeight: 1.4,
              textAlign: "center",
              fontWeight: 600,
              display: "flex",
              marginBottom: 60,
            }}
          >
            &ldquo;{review.body}&rdquo;
          </div>
          <div style={{ fontSize: 36, opacity: 0.7, display: "flex" }}>
            — {review.customerName}
          </div>
        </div>
      ),
      size
    );
  }

  // Default: "quote-minimal"
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "#ffffff",
          padding: "100px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 48, color: "#111", marginBottom: 32, display: "flex" }}>{stars}</div>
        <div
          style={{
            fontSize: 52,
            lineHeight: 1.5,
            color: "#111",
            fontWeight: 500,
            display: "flex",
            marginBottom: 48,
          }}
        >
          {review.body}
        </div>
        <div style={{ fontSize: 32, color: "#666", display: "flex" }}>{review.customerName}</div>
        <div style={{ fontSize: 28, color: "#999", marginTop: 12, display: "flex" }}>
          {review.productTitle}
        </div>
      </div>
    ),
    size
  );
}
