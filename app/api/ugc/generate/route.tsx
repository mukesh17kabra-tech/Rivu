import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// Renders a row of 5 star shapes as inline SVG — NOT text characters
// (★/☆). Satori (which next/og uses to render JSX to an image) relies on
// font glyph coverage for text, and its default font often can't render
// star unicode characters — that silently breaks image generation.
// SVG shapes have no such dependency.
//
// IMPORTANT: every single <div> below has an explicit `display` set
// (flex, in all cases) — Satori throws "Expected <div> to have explicit
// display..." for ANY div it considers to have more than one child node,
// and its counting doesn't always match React's own child-counting
// intuition (e.g. text + an interpolated expression counts as 2 nodes).
// Setting display explicitly everywhere sidesteps the ambiguity entirely.
function renderStars(rating: number, color: string, emptyColor: string, size = 48) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={n <= rating ? color : emptyColor}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

// Renders a review as a downloadable social-media graphic. Called like:
// /api/ugc/generate?reviewId=xxx&template=quote-minimal&format=story
//
// No AI image generation, no external design tool — just server-rendered
// HTML/CSS turned into a PNG via Satori (what next/og uses). Fully free,
// no per-image API cost.
export async function GET(req: NextRequest) {
  const reviewId = req.nextUrl.searchParams.get("reviewId");
  const template = req.nextUrl.searchParams.get("template") || "quote-minimal";
  const format = req.nextUrl.searchParams.get("format") || "post"; // "post" | "story"

  if (!reviewId) {
    return new Response("Missing reviewId", { status: 400 });
  }

  let review;
  try {
    review = await db.review.findUnique({ where: { id: reviewId } });
  } catch (err) {
    console.error("[ugc/generate] DB error:", err);
    return new Response("Database error", { status: 500 });
  }

  if (!review) {
    return new Response("Review not found", { status: 404 });
  }

  const size =
    format === "story" ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 };

  // Pre-build plain strings so each JSX text node is a single string, not
  // text + expression + text (multiple child nodes) — reduces ambiguity
  // for Satori's child-counting even further, on top of explicit display.
  const quotedBody = `\u201C${review.body}\u201D`;
  const byline = `\u2014 ${review.customerName}`;

  try {
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
            <div style={{ display: "flex", marginBottom: 40 }}>
              {renderStars(review.rating, "#facc15", "#4b5563", 64)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 56,
                lineHeight: 1.4,
                textAlign: "center",
                fontWeight: 600,
                marginBottom: 60,
              }}
            >
              {quotedBody}
            </div>
            <div style={{ display: "flex", fontSize: 36, opacity: 0.7 }}>{byline}</div>
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
          <div style={{ display: "flex", marginBottom: 32 }}>
            {renderStars(review.rating, "#f5b400", "#e5e5e5", 48)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              lineHeight: 1.5,
              color: "#111",
              fontWeight: 500,
              marginBottom: 48,
            }}
          >
            {review.body}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#666" }}>{review.customerName}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#999", marginTop: 12 }}>
            {review.productTitle}
          </div>
        </div>
      ),
      size
    );
  } catch (err) {
    console.error("[ugc/generate] ImageResponse render failed:", err);
    return new Response(`Image generation failed: ${(err as Error).message}`, { status: 500 });
  }
}
