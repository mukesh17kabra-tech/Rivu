"use client";

import { useState } from "react";

export function ShareButtons({ imageUrl, reviewId }: { imageUrl: string; reviewId: string }) {
  const [sharing, setSharing] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  async function handleShare() {
    setSharing(true);
    setUnsupported(false);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `review-${reviewId}.png`, { type: "image/png" });

      // Web Share API with files — on mobile this opens the native share
      // sheet (Instagram, WhatsApp, etc. all show up as options, if
      // installed). No Meta app review, no Facebook App ID needed — this
      // is just the browser's own OS-level share mechanism.
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Customer review",
        });
      } else {
        setUnsupported(true);
      }
    } catch {
      // User likely cancelled the share sheet — not an error worth showing.
    } finally {
      setSharing(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleShare}
        disabled={sharing}
        className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-60"
      >
        {sharing ? "Opening share sheet..." : "📤 Share"}
      </button>
      {unsupported && (
        <p className="mt-2 max-w-[220px] text-xs text-white/40">
          Sharing directly isn&apos;t supported on this device/browser — download the image
          instead and share it from your phone&apos;s Instagram/WhatsApp app.
        </p>
      )}
    </div>
  );
}
