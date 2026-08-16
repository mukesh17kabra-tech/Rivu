"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  message: string;
  imageUrl?: string;
  fromDeveloper: boolean;
  createdAt: string;
};

const POLL_INTERVAL_MS = 5000; // refresh every 5 seconds

export function SupportChatWidget({ shop }: { shop: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastMessageIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadMessages(silent = false) {
    try {
      const res = await fetch(`/api/support/messages?shop=${encodeURIComponent(shop)}`);
      const data = await res.json();
      const fetched: Message[] = data.messages || [];

      setMessages(fetched);

      // Detect new developer replies that the merchant hasn't seen yet —
      // count unread messages from developer (newest since last seen id).
      if (!open && fetched.length > 0) {
        const lastSeen = lastMessageIdRef.current;
        if (lastSeen) {
          const lastSeenIdx = fetched.findIndex((m) => m.id === lastSeen);
          const newFromDev = fetched
            .slice(lastSeenIdx + 1)
            .filter((m) => m.fromDeveloper);
          if (newFromDev.length > 0) {
            setUnreadCount((c) => c + newFromDev.length);
          }
        } else {
          // First load — mark existing developer messages as "already seen"
          // (don't spam the user with an unread badge on first open).
          const lastId = fetched[fetched.length - 1]?.id;
          if (lastId) lastMessageIdRef.current = lastId;
        }
      }

      if (!silent) {
        // Scroll to bottom after render.
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    } catch {
      // Silent fail — polling; not worth showing an error.
    }
  }

  // Start polling when open, stop when closed.
  useEffect(() => {
    if (open) {
      loadMessages();
      setUnreadCount(0);
      // Mark all current messages as seen.
      setMessages((prev) => {
        if (prev.length) lastMessageIdRef.current = prev[prev.length - 1].id;
        return prev;
      });
      pollRef.current = setInterval(() => loadMessages(true), POLL_INTERVAL_MS);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Background polling for unread badge even when chat is closed.
  useEffect(() => {
    const bgPoll = setInterval(() => {
      if (!open) loadMessages(true);
    }, POLL_INTERVAL_MS * 3);
    return () => clearInterval(bgPoll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function send() {
    if (!text.trim() && !imageDataUrl) return;
    setSending(true);
    try {
      await fetch("/api/support/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, message: text || "📷 Image", imageUrl: imageDataUrl }),
      });
      setText("");
      setImageDataUrl(null);
      await loadMessages();
    } finally {
      setSending(false);
    }
  }

  return (
    // Outer wrapper: fixed position, never moves — the chat panel opens
    // ABOVE the button, anchored to the same right-6/bottom-6 corner.
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}>
      {/* Chat panel — renders above the icon button using flexbox column-reverse */}
      {open && (
        <div
          style={{ marginBottom: "12px" }}
          className="flex h-[420px] w-80 flex-col rounded-xl border border-white/10 bg-[#0B0D0F] shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Support</p>
            <button onClick={() => setOpen(false)} className="text-lg text-white/40 hover:text-white">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <p className="text-xs text-white/40">
                Send us a message and we&apos;ll get back to you here.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl p-2.5 text-xs ${
                    m.fromDeveloper
                      ? "bg-white/[0.08] text-white/90"
                      : "ml-auto bg-emerald-400/20 text-emerald-100"
                  }`}
                >
                  {m.message && m.message !== "📷 Image" && (
                    <p>{m.message}</p>
                  )}
                  {m.imageUrl && (
                    <img
                      src={m.imageUrl}
                      alt="attachment"
                      className="mt-1 max-w-[180px] rounded-lg"
                    />
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {imageDataUrl && (
            <div className="flex items-center gap-2 border-t border-white/10 px-3 pt-2">
              <img src={imageDataUrl} alt="preview" className="h-10 w-10 rounded object-cover" />
              <button
                onClick={() => setImageDataUrl(null)}
                className="text-xs text-red-400 hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex gap-2 border-t border-white/10 p-3">
            <label className="cursor-pointer text-white/40 hover:text-white text-lg">
              📎
              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                className="hidden"
              />
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white"
            />
            <button
              onClick={send}
              disabled={sending || (!text.trim() && !imageDataUrl)}
              className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* The trigger button — position is always fixed here, never shifts */}
      <div className="relative" style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => { setOpen((o) => !o); setUnreadCount(0); }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 text-xl text-black shadow-lg hover:bg-emerald-300"
        >
          💬
        </button>
        {unreadCount > 0 && !open && (
          <span
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>
    </div>
  );
}
