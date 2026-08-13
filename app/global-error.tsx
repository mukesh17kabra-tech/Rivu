"use client";

/**
 * Last-resort boundary for errors thrown in the root layout itself, where
 * app/error.tsx can't help because the layout never rendered. Must supply
 * its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B0D0F",
          color: "#E7E9EA",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: "28rem", padding: 24, textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(251,191,36,0.9)",
            }}
          >
            Rivu
          </p>
          <h1 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 600 }}>
            Rivu couldn&apos;t load
          </h1>
          <p
            style={{
              margin: "0 0 24px",
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Your data is safe. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "#34d399",
              color: "#000",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: 24,
                fontFamily: "monospace",
                fontSize: 12,
                color: "rgba(255,255,255,0.25)",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
