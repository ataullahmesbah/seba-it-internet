"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Loader2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { connectRealtime, type RealtimeHandle } from "@/lib/client/realtime";

interface Msg {
  id: string;
  senderType: "VISITOR" | "STAFF" | "SYSTEM";
  body: string;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
}

interface Labels {
  title: string;
  open: string;
  available: string;
  offline: string;
  placeholder: string;
  send: string;
  sending: string;
  failed: string;
  delayed: string;
  resolved: string;
  reconnecting: string;
  welcome: string;
  close: string;
  needHelp: string;
  retry: string;
}

export function ChatWidget({ locale, labels, companyName }: { locale: "en" | "bn"; labels: Labels; companyName: string }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [conv, setConv] = useState<{ publicId: string; status: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const rtRef = useRef<RealtimeHandle | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(null);
  const tmpCounter = useRef(0);
  const [rtAttached, setRtAttached] = useState(false);

  const merge = useCallback((incoming: Msg[]) => {
    setMessages((prev) => {
      const map = new Map(prev.filter((m) => !m.pending || m.failed).map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      const arr = [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const lastReal = [...arr].reverse().find((m) => !m.pending);
      if (lastReal) lastAt.current = lastReal.createdAt;
      return arr;
    });
  }, []);

  const load = useCallback(
    async (publicId: string, incremental: boolean) => {
      const qs = incremental && lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
      const res = await fetch(`/api/v1/chat/conversations/${publicId}${qs}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (res?.success) {
        setConv({ publicId: res.data.conversation.publicId, status: res.data.conversation.status });
        merge(res.data.messages);
      }
    },
    [merge],
  );

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-chat", onOpen);
    const t = setTimeout(() => setShowTeaser(true), 4000);
    return () => {
      window.removeEventListener("open-chat", onOpen);
      clearTimeout(t);
    };
  }, []);

  // Restore / create the visitor session (once). Sending always awaits this first.
  const sessionRef = useRef<Promise<boolean> | null>(null);
  const ensureSession = useCallback(() => {
    sessionRef.current ??= (async () => {
      const res = await fetch("/api/v1/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      })
        .then((r) => r.json())
        .catch(() => null);
      if (res?.success) {
        setOnline(res.data.online);
        if (res.data.conversation) await load(res.data.conversation.publicId, false);
      }
      setReady(true);
      if (!res?.success) sessionRef.current = null; // allow retry
      return Boolean(res?.success);
    })();
    return sessionRef.current;
  }, [locale, load]);

  useEffect(() => {
    if (open && !ready) void ensureSession();
  }, [open, ready, ensureSession]);

  // Realtime subscription (optional) for the active conversation.
  useEffect(() => {
    if (!conv?.publicId) return;
    let cancelled = false;
    (async () => {
      const rt = await connectRealtime("visitor").catch(() => null);
      if (!rt || cancelled) return;
      rtRef.current = rt.handle;
      setRtAttached(true);
      rt.handle.onStateChange(setLive);
      for (const ch of (rt.meta as string[]) ?? []) {
        rt.handle.subscribe(ch, (event, data) => {
          if (event === "message.created") merge([data as Msg]);
          if (event === "conversation.status") setConv((c) => (c ? { ...c, status: (data as { status: string }).status } : c));
        });
      }
    })();
    return () => {
      cancelled = true;
      rtRef.current?.close();
      rtRef.current = null;
      setLive(false);
    };
  }, [conv?.publicId, merge]);

  // Polling fallback: every 5s while open and realtime is not connected.
  useEffect(() => {
    if (!open || !conv?.publicId || live) return;
    const id = setInterval(() => load(conv.publicId, true), 5000);
    return () => clearInterval(id);
  }, [open, conv?.publicId, live, load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(body: string, retryId?: string) {
    tmpCounter.current += 1;
    const tempId = retryId ?? `tmp-${tmpCounter.current}`;
    const optimistic: Msg = { id: tempId, senderType: "VISITOR", body, createdAt: new Date().toISOString(), pending: true };
    setMessages((prev) => [...prev.filter((m) => m.id !== tempId), optimistic]);
    setSending(true);
    setNotice(null);
    try {
      if (!(await ensureSession())) throw new Error("session");
      const startNew = !conv || conv.status === "CLOSED";
      const url = startNew ? "/api/v1/chat/conversations" : `/api/v1/chat/conversations/${conv!.publicId}/messages`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, locale }) }).then((r) => r.json());
      if (!res.success) throw new Error(res.error?.code);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      merge([res.data.message]);
      setConv({ publicId: res.data.conversation.publicId, status: res.data.conversation.status });
      if (!res.data.realtime && live) setNotice(labels.delayed);
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m)));
      setNotice(labels.failed);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setText("");
    void send(body.slice(0, 2000));
  }

  return (
    <>
      {!open && (
        <div className="fixed right-4 z-40 flex items-end gap-2" style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
          {showTeaser && (
            <button type="button" onClick={() => setOpen(true)} className="card hidden px-3 py-2 text-left text-xs sm:block">
              <span className="block font-semibold text-ink">{labels.needHelp}</span>
              <span className="text-muted">{labels.available}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={labels.open}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[var(--shadow-lift)] transition-transform hover:scale-105"
          >
            <MessageCircle className="h-6 w-6" aria-hidden />
          </button>
        </div>
      )}
      {open && (
        <section
          role="dialog"
          aria-label={labels.title}
          className="fixed inset-x-2 z-50 flex max-h-[min(640px,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl sm:inset-x-auto sm:right-4 sm:w-[380px]"
          style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <header className="flex items-center justify-between bg-navy px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">{companyName}</p>
              <p className="flex items-center gap-1.5 text-xs text-white/75">
                <span className={cn("inline-block h-2 w-2 rounded-full", online ? "bg-emerald-400" : "bg-amber-400")} aria-hidden />
                {online ? labels.available : labels.offline}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={labels.close} className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </header>
          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-page px-3 py-4" aria-live="polite" aria-relevant="additions">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm shadow-sm">{labels.welcome}</div>
            {!ready && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Loading" />
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.senderType === "VISITOR" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm",
                    m.senderType === "VISITOR" ? "rounded-tr-sm bg-primary text-white" : "rounded-tl-sm bg-white text-ink",
                    m.pending && !m.failed && "opacity-70",
                    m.failed && "bg-red-50 text-danger ring-1 ring-danger/30",
                  )}
                >
                  {m.body}
                  {m.failed && (
                    <button type="button" onClick={() => send(m.body, m.id)} className="mt-1 flex items-center gap-1 text-xs font-semibold underline">
                      <RotateCw className="h-3 w-3" aria-hidden /> {labels.retry}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {conv?.status === "RESOLVED" && <p className="py-2 text-center text-xs text-muted">{labels.resolved}</p>}
          </div>
          {(notice || (conv && !live && ready && rtAttached)) && (
            <p className="border-t border-line bg-amber-50 px-3 py-1.5 text-[11px] text-warning" role="status">
              {notice ?? (rtAttached ? labels.reconnecting : "")}
            </p>
          )}
          <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-line bg-white p-2.5">
            <label htmlFor="chat-input" className="sr-only">
              {labels.placeholder}
            </label>
            <textarea
              id="chat-input"
              rows={1}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              placeholder={labels.placeholder}
              className="input max-h-28 min-h-11 resize-none py-2.5"
            />
            <button type="submit" disabled={sending || !text.trim()} className="btn-primary !min-h-11 !px-3.5" aria-label={sending ? labels.sending : labels.send}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </section>
      )}
    </>
  );
}
