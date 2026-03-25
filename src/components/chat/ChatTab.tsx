"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { consume } from "@/lib/prefetch";
import { MEMBER_EMOJIS } from "@/lib/constants";

interface Message {
  id: number;
  content: string;
  createdAt: string;
  author: { name: string };
}

export default function ChatTab({ currentUser }: { currentUser: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastId, setLastId] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  const fetchMessages = useCallback(async (since?: number) => {
    const url = since ? `/api/messages?since=${since}` : "/api/messages";
    const res = await fetch(url);
    const data: Message[] = await res.json();
    if (data.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = data.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newMsgs];
      });
      setLastId(data[data.length - 1].id);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      const cached = consume("messages");
      if (cached && cached.length > 0) {
        setMessages(cached);
        setLastId(cached[cached.length - 1].id);
      } else {
        fetchMessages();
      }
    }
    const interval = setInterval(() => {
      setLastId((prev) => { fetchMessages(prev); return prev; });
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg: Message = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setLastId(msg.id);
      }
    } finally {
      setSending(false);
    }
  }

  const timeStr = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  const isSelf = (name: string) => name === currentUser;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 pb-2 scrollbar-hide" style={{ minHeight: 0 }}>
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p className="text-4xl mb-3">💬</p>
            <p>아직 메시지가 없어요.</p>
            <p className="text-sm mt-1">첫 번째 메시지를 보내봐요!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isSelf(msg.author.name) ? "flex-row-reverse" : ""}`}
            >
              {!isSelf(msg.author.name) && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">
                  {MEMBER_EMOJIS[msg.author.name] ?? "👤"}
                </div>
              )}
              <div className={`max-w-[75%] ${isSelf(msg.author.name) ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                {!isSelf(msg.author.name) && (
                  <p className="text-gray-500 text-xs ml-1">{msg.author.name}</p>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isSelf(msg.author.name)
                      ? "bg-purple-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <p className="text-gray-600 text-xs mx-1">{timeStr(msg.createdAt)}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="메시지 입력..."
          className="flex-1 bg-gray-800 rounded-2xl px-4 py-3 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500 border border-gray-700"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="w-12 h-12 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          <span className="text-lg">{sending ? "⌛" : "➤"}</span>
        </button>
      </div>
    </div>
  );
}
