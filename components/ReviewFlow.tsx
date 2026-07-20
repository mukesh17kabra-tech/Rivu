"use client";

import { useState } from "react";

export function ReviewFlow({
  shop,
  productId,
  productTitle,
  productImage,
}: {
  shop: string;
  productId: string;
  productTitle: string;
  productImage?: string;
}) {
  const [rating, setRating] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [body, setBody] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function pickRating(stars: number) {
    setRating(stars);
    setBody("");
    await loadSuggestions(stars);
  }

  async function loadSuggestions(stars: number) {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(
        `/api/reviews/suggestions?rating=${stars}&productTitle=${encodeURIComponent(productTitle)}`
      );
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resize/compress client-side before turning into a data URI, so we
    // don't send huge base64 payloads (keeps things fast, avoids hitting
    // serverless function body-size limits).
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1000;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          productId,
          productTitle,
          productImageUrl: productImage,
          rating,
          body,
          customerName: customerName || "Anonymous",
          photoUrl: photoDataUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("done");
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error, please try again.");
    }
  }

  if (status === "done") {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-2xl mb-2">🎉</p>
          <h1 className="text-lg font-semibold mb-2">Thanks for your review!</h1>
          <p className="text-sm text-gray-500">
            It&apos;ll appear on the product page once approved.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-5 py-8">
      <div className="mx-auto max-w-md">
        {productImage && (
          <img
            src={productImage}
            alt={productTitle}
            className="mb-4 h-40 w-full rounded-lg object-cover"
          />
        )}
        <h1 className="mb-1 text-lg font-semibold text-gray-900">{productTitle}</h1>
        <p className="mb-6 text-sm text-gray-500">How would you rate it?</p>

        {/* Star selector */}
        <div className="mb-6 flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => pickRating(star)}
              className="text-4xl leading-none"
              aria-label={`${star} star`}
            >
              <span className={star <= rating ? "text-yellow-400" : "text-gray-200"}>★</span>
            </button>
          ))}
        </div>

        {rating > 0 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Pick a suggestion (or write your own)</p>
                <button
                  type="button"
                  onClick={() => loadSuggestions(rating)}
                  disabled={loadingSuggestions}
                  className="text-xs font-medium text-blue-600 disabled:opacity-50"
                >
                  {loadingSuggestions ? "Loading..." : "🔄 Refresh"}
                </button>
              </div>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBody(s)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      body === s
                        ? "border-blue-500 bg-blue-50 text-gray-900"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Your review</label>
              <textarea
                required
                minLength={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tap a suggestion above or type your own..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Your name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Add a photo (optional)
              </label>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-sm" />
              {photoDataUrl && (
                <img src={photoDataUrl} alt="Preview" className="mt-2 h-24 rounded-md object-cover" />
              )}
            </div>

            {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-md bg-black py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {status === "submitting" ? "Submitting..." : "Submit review"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
