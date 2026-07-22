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
// display..." for ANY div it considers to have more than one child node.
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

export const TEMPLATES = [
  { value: "quote-minimal", label: "Minimal (white)" },
  { value: "story-bold", label: "Bold (dark)" },
  { value: "pastel-card", label: "Pastel card" },
  { value: "gradient-pop", label: "Gradient pop" },
  { value: "polaroid", label: "Polaroid style" },
  { value: "receipt", label: "Receipt style" },
  { value: "bordered-classic", label: "Bordered classic" },
  { value: "big-quote", label: "Big quote marks" },
] as const;

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

  let logoUrl: string | null = null;
  let logoSize = 140;
  try {
    const shop = await db.shop.findUnique({
      where: { id: review.shopId },
      select: { logoUrl: true, logoSize: true },
    });
    logoUrl = shop?.logoUrl || null;
    logoSize = shop?.logoSize || 140;
  } catch {
    // Non-critical — just skip the watermark if this lookup fails.
  }

  const size =
    format === "story" ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 };

  const quotedBody = `\u201C${review.body}\u201D`;
  const byline = `\u2014 ${review.customerName}`;
  const rating = review.rating;
  const body = review.body;
  const customerName = review.customerName;
  const productTitle = review.productTitle;

  function logoWatermark(color = "#fff", opacity = 1, inset = 24) {
    return logoUrl ? (
      <img
        src={logoUrl}
        width={logoSize}
        style={{ position: "absolute", bottom: inset, right: inset, borderRadius: 6, opacity }}
      />
    ) : null;
  }

  try {
    let content;

    if (template === "story-bold") {
      content = (
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
            position: "relative",
          }}
        >
          <div style={{ display: "flex", marginBottom: 40 }}>
            {renderStars(rating, "#facc15", "#4b5563", 64)}
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
          {logoWatermark()}
        </div>
      );
    } else if (template === "pastel-card") {
      content = (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "linear-gradient(160deg, #fde2e4 0%, #cfe8f3 100%)",
            padding: "90px",
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "#ffffff",
              borderRadius: 24,
              padding: "60px 50px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", marginBottom: 28 }}>
              {renderStars(rating, "#f472b6", "#f1f1f1", 42)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 46,
                lineHeight: 1.5,
                color: "#333",
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              {body}
            </div>
            <div style={{ display: "flex", fontSize: 30, color: "#999", fontWeight: 600 }}>
              {customerName}
            </div>
          </div>
          {logoWatermark("#000")}
        </div>
      );
    } else if (template === "gradient-pop") {
      content = (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f97316 100%)",
            padding: "100px",
            fontFamily: "sans-serif",
            color: "#fff",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", marginBottom: 32 }}>
            {renderStars(rating, "#ffffff", "rgba(255,255,255,0.35)", 48)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 54,
              lineHeight: 1.4,
              fontWeight: 700,
              marginBottom: 48,
            }}
          >
            {body}
          </div>
          <div style={{ display: "flex", fontSize: 32, opacity: 0.9 }}>{customerName}</div>
          <div style={{ display: "flex", fontSize: 26, opacity: 0.75, marginTop: 8 }}>
            {productTitle}
          </div>
          {logoWatermark()}
        </div>
      );
    } else if (template === "polaroid") {
      content = (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "#e5e5e5",
            padding: "70px",
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              padding: "40px 40px 70px 40px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
              transform: "rotate(-2deg)",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 700,
                height: 500,
                background: "#f5f5f5",
                marginBottom: 32,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {renderStars(rating, "#f5b400", "#ddd", 60)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 40,
                color: "#333",
                lineHeight: 1.4,
                marginBottom: 16,
                fontFamily: "sans-serif",
              }}
            >
              {body}
            </div>
            <div style={{ display: "flex", fontSize: 28, color: "#999" }}>{"- " + customerName}</div>
          </div>
          {logoWatermark("#000")}
        </div>
      );
    } else if (template === "receipt") {
      content = (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "#faf8f3",
            padding: "80px",
            fontFamily: "monospace",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              padding: "50px 40px",
              width: "100%",
              border: "2px dashed #ccc",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 32,
                color: "#111",
                marginBottom: 24,
                fontWeight: 700,
                justifyContent: "center",
              }}
            >
              {"CUSTOMER REVIEW"}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              {renderStars(rating, "#111", "#ddd", 40)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 36,
                color: "#222",
                lineHeight: 1.5,
                marginBottom: 32,
                borderTop: "2px dashed #ccc",
                borderBottom: "2px dashed #ccc",
                padding: "24px 0",
              }}
            >
              {body}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#666", justifyContent: "space-between" }}>
              <span>{customerName}</span>
              <span>{productTitle}</span>
            </div>
          </div>
          {logoWatermark("#000")}
        </div>
      );
    } else if (template === "bordered-classic") {
      content = (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: "#ffffff",
            padding: "60px",
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              height: "100%",
              border: "6px solid #111",
              padding: "70px 60px",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", marginBottom: 36 }}>
              {renderStars(rating, "#111", "#ddd", 50)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 48,
                lineHeight: 1.5,
                color: "#111",
                textAlign: "center",
                fontWeight: 500,
                marginBottom: 44,
              }}
            >
              {quotedBody}
            </div>
            <div style={{ display: "flex", fontSize: 30, color: "#555", fontWeight: 700 }}>
              {customerName.toUpperCase()}
            </div>
          </div>
          {logoWatermark("#000", 1, 44)}
        </div>
      );
    } else if (template === "big-quote") {
      content = (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            background: "#111827",
            padding: "100px",
            fontFamily: "sans-serif",
            color: "#fff",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", fontSize: 160, color: "#3b82f6", lineHeight: 1, marginBottom: -20 }}>
            {"\u201C"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 50,
              lineHeight: 1.4,
              fontWeight: 600,
              marginBottom: 40,
            }}
          >
            {body}
          </div>
          <div style={{ display: "flex", marginBottom: 20 }}>
            {renderStars(rating, "#3b82f6", "#374151", 40)}
          </div>
          <div style={{ display: "flex", fontSize: 30, opacity: 0.7 }}>{byline}</div>
          {logoWatermark()}
        </div>
      );
    } else {
      // Default: "quote-minimal"
      content = (
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
            position: "relative",
          }}
        >
          <div style={{ display: "flex", marginBottom: 32 }}>
            {renderStars(rating, "#f5b400", "#e5e5e5", 48)}
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
            {body}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#666" }}>{customerName}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#999", marginTop: 12 }}>
            {productTitle}
          </div>
          {logoWatermark("#000")}
        </div>
      );
    }

    return new ImageResponse(content, size);
  } catch (err) {
    console.error("[ugc/generate] ImageResponse render failed:", err);
    return new Response(`Image generation failed: ${(err as Error).message}`, { status: 500 });
  }
}
