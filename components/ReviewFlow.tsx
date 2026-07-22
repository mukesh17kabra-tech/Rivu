"use client";

import { useState } from "react";

type Product = { productId: string; productTitle: string };

export function ReviewFlow({
  shop,
  productId: initialProductId,
  productTitle: initialProductTitle,
  productImage,
}: {
  shop: string;
  productId?: string;
  productTitle?: string;
  productImage?: string;
}) {
  // If a specific product was already given (old per-product QR still
  // supported), skip straight past the email/product-picker step.
  const [step, setStep] = useState<"email" | "pick-product" | "review">(
    initialProductId ? "review" : "email"
  );
  const [email, setEmail] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const [productId, setProductId] = useState(initialProductId || "");
  const [productTitle, setProductTitle] = useState(initialProductTitle || "");

  const [rating, setRating] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestionsAllowed, setSuggestionsAllowed] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [body, setBody] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [discountCode, setDiscountCode] = useState<string | undefined>();

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLookupLoading(true);
    setLookupError("");
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, email }),
      });
      const data = await res.json();
      if (res.ok && data.products?.length) {
        setProducts(data.products);
        if (data.products.length === 1) {
          setProductId(data.products[0].productId);
          setProductTitle(data.products[0].productTitle);
          setStep("review");
        } else {
          setStep("pick-product");
        }
      } else {
        setLookupError(data.error || "Couldn't find an order with that email.");
      }
    } catch {
      setLookupError("Network error, please try again.");
    } finally {
      setLookupLoading(false);
    }
  }

  function pickProduct(p: Product) {
    setProductId(p.productId);
    setProductTitle(p.productTitle);
    setStep("review");
  }

  async function pickRating(stars: number) {
    setRating(stars);
    setBody("");
    setShowSuggestions(true);

    // Check whether this shop wants suggestions shown on the QR flow —
    // reuses the reviews/list endpoint's design payload (cheap, cached by
    // the browser within the session).
    try {
      const res = await fetch(
        `/api/reviews/list?shop=${encodeURIComponent(shop)}&productId=${encodeURIComponent(productId)}`
      );
      const data = await res.json();
      const allowed = data.design?.showSuggestionsOnQr ?? true;
      setSuggestionsAllowed(allowed);
      if (allowed) await loadSuggestions(stars);
    } catch {
      await loadSuggestions(stars);
    }
  }

  async function loadSuggestions(stars: number) {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(
        `/api/reviews/suggestions?rating=${stars}&productTitle=${encodeURIComponent(productTitle)}&shop=${encodeURIComponent(shop)}`
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
          reviewTitle: reviewTitle || undefined,
          body,
          customerName: customerName || "Anonymous",
          customerEmail: email || undefined,
          photoUrl: photoDataUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiscountCode(data.discountCode);
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

  // ---- Step 1: email (generic QR, no product known yet) ----
  if (step === "email") {
    return (
      <main className="min-h-screen bg-white px-5 py-8">
        <div className="mx-auto max-w-sm">
          <h1 className="mb-1 text-lg font-semibold text-gray-900">Leave a review</h1>
          <p className="mb-6 text-sm text-gray-500">
            Enter the email you used to order — we&apos;ll pull up what you bought.
          </p>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {lookupError && <p className="text-sm text-red-500">{lookupError}</p>}
            <button
              type="submit"
              disabled={lookupLoading}
              className="w-full rounded-md bg-black py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {lookupLoading ? "Looking up your order..." : "Continue"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ---- Step 2: pick which product (if the order had more than one) ----
  if (step === "pick-product") {
    return (
      <main className="min-h-screen bg-white px-5 py-8">
        <div className="mx-auto max-w-sm">
          <h1 className="mb-1 text-lg font-semibold text-gray-900">What would you like to review?</h1>
          <p className="mb-6 text-sm text-gray-500">You bought a few things — pick one to start.</p>
          <div className="space-y-2">
            {products.map((p) => (
              <button
                key={p.productId}
                onClick={() => pickProduct(p)}
                className="w-full rounded-md border border-gray-200 px-3 py-3 text-left text-sm text-gray-800 hover:border-gray-400"
              >
                {p.productTitle}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ---- Step 3: done ----
  if (status === "done") {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-2xl mb-2">🎉</p>
          <h1 className="text-lg font-semibold mb-2">Thanks for your review!</h1>
          <p className="text-sm text-gray-500 mb-4">
            It&apos;ll appear on the product page once approved.
          </p>
          {discountCode && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="mb-1 text-xs text-gray-500">Here&apos;s a thank-you discount:</p>
              <p className="text-lg font-mono font-semibold tracking-wide">{discountCode}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ---- Step 3: rating + suggestions + submit ----
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
            {showSuggestions && suggestionsAllowed && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Pick a suggestion (or write your own)</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => loadSuggestions(rating)}
                      disabled={loadingSuggestions}
                      className="text-xs font-medium text-blue-600 disabled:opacity-50"
                    >
                      {loadingSuggestions ? "Loading..." : "🔄 Refresh"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="text-xs font-medium text-gray-400 hover:text-gray-600"
                    >
                      ✕ Close
                    </button>
                  </div>
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
            )}

            {!showSuggestions && suggestionsAllowed && (
              <button
                type="button"
                onClick={() => setShowSuggestions(true)}
                className="text-xs font-medium text-blue-600"
              >
                Show suggestions again
              </button>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Give your review a title (optional)
              </label>
              <input
                type="text"
                maxLength={150}
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Sum it up in a few words"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium"
              />
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
