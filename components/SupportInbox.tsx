"use client";

import { useEffect, useRef, useState } from "react";

type ShopOverview = {
  shop: string;
  lastMessage: string;
  lastMessageAt: string;
  lastFromDeveloper: boolean;
  unreadCount: number;
};

type Message = {
  id: string;
  message: string;
  imageUrl?: string;
  fromDeveloper: boolean;
  createdAt: string;
};

const POLL_MS = 5000;

export function SupportInbox({ apiKey, initialShop }: { apiKey: string; initialShop?: string }) {
  const [shops, setShops] = useState<ShopOverview[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | undefined>(initialShop);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadOverview() {
    const res = await fetch(`/api/developer/support/list?key=${encodeURIComponent(apiKey)}`);
    const data = await res.json();
    setShops(data.shops || []);
  }

  async function loadConversation(shop: string) {
    const res = await fetch(
      `/api/developer/support/list?key=${encodeURIComponent(apiKey)}&shop=${encodeURIComponent(shop)}`
    );
    const data = await res.json();
    setMessages(data.messages || []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  // Poll for new messages every 5 seconds.
  useEffect(() => {
    loadOverview();
    if (selectedShop) loadConversation(selectedShop);

    const poll = setInterval(() => {
      loadOverview();
      if (selectedShop) loadConversation(selectedShop);
    }, POLL_MS);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop]);

  function openShop(shop: string) {
    setSelectedShop(shop);
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function sendReply() {
    if (!selectedShop || (!reply.trim() && !imageDataUrl)) return;
    setSending(true);
    try {
      await fetch("/api/developer/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: apiKey,
          shop: selectedShop,
          message: reply || "📷 Image",
          imageUrl: imageDataUrl,
        }),
      });
      setReply("");
      setImageDataUrl(null);
      await loadConversation(selectedShop);
      await loadOverview();
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#0B0D0F] text-[#E7E9EA] font-sans">
      {/* Shop list */}
      <div className="w-72 flex-shrink-0 border-r border-white/10 overflow-y-auto">
        <div className="border-b border-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">Rivu</p>
          <h1 className="mt-1 text-lg font-semibold">Support Inbox</h1>
        </div>
        {shops.length === 0 ? (
          <p className="p-4 text-sm text-white/40">No messages yet.</p>
        ) : (
          shops.map((s) => (
            <button
              key={s.shop}
              onClick={() => openShop(s.shop)}
              className={`block w-full border-b border-white/5 p-4 text-left transition-colors ${
                selectedShop === s.shop ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium text-white">{s.shop}</p>
                {s.unreadCount > 0 && (
                  <span className="ml-2 flex-shrink-0 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
                    {s.unreadCount}
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-white/40">
                {s.lastFromDeveloper ? "You: " : ""}
                {s.lastMessage}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Conversation */}
      <div className="flex flex-1 flex-col">
        {!selectedShop ? (
          <div className="flex flex-1 items-center justify-center text-sm text-white/40">
            Select a shop to view the conversation.
          </div>
        ) : (
          <>
            <div className="border-b border-white/10 p-4">
              <p className="text-sm font-medium text-white">{selectedShop}</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-white/40">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-md rounded-xl p-3 text-sm ${
                      m.fromDeveloper
                        ? "ml-auto bg-emerald-400/20 text-emerald-100"
                        : "bg-white/[0.05] text-white/90"
                    }`}
                  >
                    {m.message && m.message !== "📷 Image" && <p>{m.message}</p>}
                    {m.imageUrl && (
                      <img src={m.imageUrl} alt="attachment" className="mt-1 max-w-[200px] rounded-lg" />
                    )}
                    <p className="mt-1 text-[10px] opacity-50">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {imageDataUrl && (
              <div className="flex items-center gap-2 border-t border-white/10 px-4 pt-2">
                <img src={imageDataUrl} alt="preview" className="h-12 w-12 rounded object-cover" />
                <button
                  onClick={() => setImageDataUrl(null)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex gap-2 border-t border-white/10 p-4">
              <label className="cursor-pointer text-white/40 hover:text-white text-xl self-center">
                📎
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a reply..."
                className="flex-1 rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
                rows={2}
              />
              <button
                onClick={sendReply}
                disabled={sending || (!reply.trim() && !imageDataUrl)}
                className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-300 disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
