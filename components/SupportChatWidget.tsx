"use client";

import { useEffect, useState } from "react";

type Message = { id: string; message: string; fromDeveloper: boolean; createdAt: string };

export function SupportChatWidget({ shop }: { shop: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function loadMessages() {
    const res = await fetch(`/api/support/messages?shop=${encodeURIComponent(shop)}`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  useEffect(() => {
    if (open) loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await fetch("/api/support/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, message: text }),
      });
      setText("");
      await loadMessages();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 flex h-96 w-80 flex-col rounded-lg border border-white/10 bg-[#0B0D0F] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-3">
            <p className="text-sm font-medium text-white">Support</p>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
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
                  className={`max-w-[85%] rounded-lg p-2 text-xs ${
                    m.fromDeveloper
                      ? "bg-white/[0.08] text-white/90"
                      : "ml-auto bg-emerald-400/20 text-emerald-100"
                  }`}
                >
                  {m.message}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 border-t border-white/10 p-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message..."
              className="flex-1 rounded-md border border-white/15 bg-white/[0.03] px-2 py-1.5 text-xs text-white"
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="rounded-md bg-emerald-400 px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 text-black shadow-lg hover:bg-emerald-300"
      >
        💬
      </button>
    </div>
  );
}
