"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderId: string;
  sender: { id: string; name: string };
};

export function CollaborationMessages({ collaborationId, disabled = false }: { collaborationId: string; disabled?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/collaborations/${collaborationId}/messages?limit=60`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load messages.");
    setCurrentUserId(data.currentUserId);
    setMessages(data.messages);
    setUnreadCount(data.unreadCount);
    setLoading(false);
    if (firstLoad.current) {
      firstLoad.current = false;
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }));
    }
  }, [collaborationId]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try { if (alive) await refresh(); }
      catch (cause) { if (alive) setError(cause instanceof Error ? cause.message : "Unable to load messages."); }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 3500);
    return () => { alive = false; window.clearInterval(timer); };
  }, [refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage() {
    const body = draft.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/collaborations/${collaborationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Message could not be sent.");
      setDraft("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Messages</h2>
          <p className="mt-1 text-xs text-slate-500">Private conversation for this collaboration · updates automatically</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{unreadCount ? `${unreadCount} unread` : "Up to date"}</span>
      </div>
      <div className="mt-4 max-h-[28rem] min-h-48 space-y-3 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3" aria-live="polite" aria-relevant="additions text">
        {loading && <p className="py-8 text-center text-sm text-slate-500">Loading conversation…</p>}
        {!loading && messages.length === 0 && <div className="py-10 text-center"><p className="text-sm font-medium text-slate-700">No messages yet</p><p className="mt-1 text-xs text-slate-500">Start the conversation with the other party.</p></div>}
        {messages.map((message) => {
          const own = message.senderId === currentUserId;
          return (
            <article key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${own ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-900"}`}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <strong className={`text-xs ${own ? "text-blue-100" : "text-slate-700"}`}>{own ? "You" : message.sender.name}</strong>
                  <time className={`text-[10px] ${own ? "text-blue-100" : "text-slate-400"}`}>{new Date(message.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>
                </div>
                <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 ${own ? "text-white" : "text-slate-700"}`}>{message.body}</p>
                {own && <p className="mt-1 text-right text-[10px] text-blue-100">{message.readAt ? "Read" : "Sent"}</p>}
              </div>
            </article>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="sr-only" htmlFor={`message-${collaborationId}`}>Write a message</label>
        <textarea id={`message-${collaborationId}`} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={2} maxLength={3000} disabled={disabled || sending} placeholder={disabled ? "Messaging is closed for this collaboration." : "Write a message… (Enter to send, Shift + Enter for a new line)"} className="min-h-12 w-full flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
        <button type="button" onClick={() => void sendMessage()} disabled={disabled || sending || !draft.trim()} className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Sending…" : "Send message"}</button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Messages are visible only to members of this collaboration. Avoid sharing passwords or payment credentials.</p>
    </section>
  );
}
