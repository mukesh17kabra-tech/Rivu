"use client";

import { useEffect, useState } from "react";

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
  fromDeveloper: boolean;
  createdAt: string;
};

export function SupportInbox({ apiKey, initialShop }: { apiKey: string; initialShop?: string }) {
  const [shops, setShops] = useState<ShopOverview[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | undefined>(initialShop);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadOverview() {
    const res = await fetch(`/api/developer/support/list?key=${encodeURIComponent(apiKey)}`);
    const data = await res.json();
    setShops(data.shops || []);
  }

  async function loadConversation(shop: string) {
    setLoading(true);
    const res = await fetch(
      `/api/developer/support/list?key=${encodeURIComponent(apiKey)}&shop=${encodeURIComponent(shop)}`
    );
    const data = await res.json();
    setMessages(data.messages || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOverview();
    if (selectedShop) loadConversation(selectedShop);
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openShop(shop: string) {
    setSelectedShop(shop);
    loadConversation(shop);
  }

  async function sendReply() {
    if (!selectedShop || !reply.trim()) return;
    setSending(true);
    try {
      await fetch("/api/developer/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey, shop: selectedShop, message: reply }),
      });
      setReply("");
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
              {loading ? (
                <p className="text-sm text-white/40">Loading...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-white/40">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-md rounded-lg p-3 text-sm ${
                      m.fromDeveloper
                        ? "ml-auto bg-emerald-400/20 text-emerald-100"
                        : "bg-white/[0.05] text-white/90"
                    }`}
                  >
                    <p>{m.message}</p>
                    <p className="mt-1 text-[10px] opacity-50">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-white/10 p-4">
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 rounded-md border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white"
                  rows={2}
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-300 disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
