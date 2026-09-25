"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Lock, Send, UserPlus, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { connectRealtime, type RealtimeHandle } from "@/lib/client/realtime";
import { Badge } from "./ui";

interface ConvItem {
  id: string;
  publicId: string;
  status: string;
  visitorName: string;
  visitorPhone: string | null;
  assigned: { id: string; displayName: string } | null;
  supportUnread: number;
  lastMessageAt: string;
  preview: string;
}

interface Msg {
  id: string;
  senderType: "VISITOR" | "STAFF" | "SYSTEM";
  body: string;
  createdAt: string;
  staffName?: string | null;
}

interface Detail {
  id: string;
  publicId: string;
  status: string;
  assigned: { id: string; displayName: string } | null;
  visitor: { name: string | null; phone: string | null; email: string | null; since: string };
}

const TABS = [
  ["", "Open"],
  ["WAITING", "Waiting"],
  ["ACTIVE", "Active"],
  ["RESOLVED", "Resolved"],
  ["CLOSED", "Closed"],
] as const;

const time = (iso: string) => new Date(iso).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", timeZone: "Asia/Dhaka" });

export function ChatConsole({ me, canReply, agents }: { me: { id: string; name: string }; canReply: boolean; agents: Array<{ id: string; name: string }> }) {
  const sp = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<string>("");
  const [list, setList] = useState<ConvItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(sp.get("c"));
  const [detail, setDetail] = useState<Detail | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const rt = useRef<RealtimeHandle | null>(null);
  const chatPrefix = useRef<string>("");
  const subscribed = useRef<Set<string>>(new Set());
  const listEnd = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(null);

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/v1/admin/chat/conversations${tab ? `?status=${tab}` : ""}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (res?.success) {
      setList(res.data.conversations);
      setCounts(res.data.counts);
    }
  }, [tab]);

  const loadDetail = useCallback(async (id: string, incremental: boolean) => {
    const qs = incremental && lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
    const res = await fetch(`/api/v1/admin/chat/conversations/${id}${qs}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (!res?.success) return;
    setDetail(res.data.conversation);
    setMessages((prev) => {
      const map = new Map((incremental ? prev : []).map((m) => [m.id, m]));
      for (const m of res.data.messages as Msg[]) map.set(m.id, m);
      const arr = [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      lastAt.current = arr.at(-1)?.createdAt ?? null;
      return arr;
    });
  }, []);

  // Realtime (optional) — queue + per-conversation channels.
  useEffect(() => {
    let closed = false;
    connectRealtime("admin")
      .then((r) => {
        if (!r || closed) return;
        rt.current = r.handle;
        const meta = r.meta as { queue: string | null; chatPrefix: string };
        chatPrefix.current = meta.chatPrefix;
        r.handle.onStateChange(setLive);
        if (meta.queue) r.handle.subscribe(meta.queue, () => void loadList());
      })
      .catch(() => {});
    return () => {
      closed = true;
      rt.current?.close();
    };
  }, [loadList]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch from our API (external system); state is set after the response
    void loadList();
    // Polling fallback every 10s while the console is open (DB is the source of truth).
    const id = setInterval(loadList, live ? 60000 : 10000);
    return () => clearInterval(id);
  }, [loadList, live]);

  useEffect(() => {
    if (!selected) return;
    lastAt.current = null;
    void loadDetail(selected, false);
    const id = setInterval(() => loadDetail(selected, true), live ? 30000 : 5000);
    return () => clearInterval(id);
  }, [selected, loadDetail, live]);

  useEffect(() => {
    if (!detail || !rt.current || !chatPrefix.current) return;
    const ch = chatPrefix.current + detail.publicId;
    if (subscribed.current.has(ch)) return;
    subscribed.current.add(ch);
    rt.current.subscribe(ch, (event) => {
      if (event === "message.created" || event === "conversation.status") void loadDetail(detail.id, true);
    });
  }, [detail, loadDetail]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function open(id: string) {
    setSelected(id);
    setError(null);
    router.replace(`/admin/chat?c=${id}`, { scroll: false });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !text.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/v1/admin/chat/conversations/${selected}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text.trim() }) })
      .then((r) => r.json())
      .catch(() => null);
    setSending(false);
    if (!res?.success) return setError(res?.error?.message ?? "Message was not sent. Retry.");
    setText("");
    await loadDetail(selected, true);
    void loadList();
  }

  async function patch(body: Record<string, unknown>) {
    if (!selected) return;
    const res = await fetch(`/api/v1/admin/chat/conversations/${selected}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    if (!res.success) setError(res.error?.message ?? "Update failed.");
    await loadDetail(selected, false);
    void loadList();
  }

  const closed = detail?.status === "CLOSED";

  return (
    <div className="card grid h-[calc(100dvh-10rem)] min-h-[520px] overflow-hidden md:grid-cols-[320px_1fr]">
      <aside className={cn("flex min-h-0 flex-col border-r border-line", selected && "hidden md:flex")}>
        <div className="flex gap-1 overflow-x-auto border-b border-line p-2">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium", tab === k ? "bg-primary text-white" : "hover:bg-slate-100")}>
              {label}
              {k && counts[k] ? <span className="ml-1 opacity-70">{counts[k]}</span> : null}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 border-b border-line px-3 py-1.5 text-[11px] text-muted">
          {live ? <Wifi className="h-3 w-3 text-success" /> : <WifiOff className="h-3 w-3" />} {live ? "Live updates" : "Auto-refreshing every 10s"}
        </p>
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {list.length === 0 && <li className="p-6 text-center text-sm text-muted">No conversations</li>}
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => open(c.id)} className={cn("w-full px-3 py-3 text-left hover:bg-slate-50", selected === c.id && "bg-primary-soft")}>
                <span className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm font-semibold">{c.visitorName}</span>
                  {c.supportUnread > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{c.supportUnread}</span>}
                  <Badge>{c.status}</Badge>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">{c.preview || "—"}</span>
                <span className="mt-0.5 flex justify-between text-[11px] text-slate-400">
                  <span>{c.assigned ? `→ ${c.assigned.displayName}` : "Unassigned"}</span>
                  <span>{time(c.lastMessageAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className={cn("flex min-h-0 flex-col", !selected && "hidden md:flex")}>
        {!detail ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted">Select a conversation</div>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <button type="button" onClick={() => setSelected(null)} className="text-sm text-primary md:hidden">← Back</button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{detail.visitor.name ?? "Visitor"}</p>
                <p className="truncate text-xs text-muted">{[detail.visitor.phone, detail.visitor.email].filter(Boolean).join(" · ") || "No contact details provided"}</p>
              </div>
              <Badge>{detail.status}</Badge>
              {canReply && !closed && (
                <>
                  <label className="sr-only" htmlFor="assign">Assign</label>
                  <select id="assign" value={detail.assigned?.id ?? ""} onChange={(e) => patch({ assignedUserId: e.target.value || null })} className="input !min-h-9 w-40 text-xs">
                    <option value="">Unassigned</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.id === me.id ? `Me (${a.name})` : a.name}</option>)}
                  </select>
                  {detail.assigned?.id !== me.id && (
                    <button type="button" onClick={() => patch({ assignedUserId: me.id })} className="btn-outline !min-h-9 !px-3 text-xs"><UserPlus className="h-4 w-4" /> Assign me</button>
                  )}
                  {detail.status !== "RESOLVED" && (
                    <button type="button" onClick={() => patch({ status: "RESOLVED" })} className="btn-outline !min-h-9 !px-3 text-xs"><CheckCircle2 className="h-4 w-4" /> Resolve</button>
                  )}
                  <button type="button" onClick={() => confirm("Close this conversation? The visitor will start a new conversation next time.") && patch({ status: "CLOSED" })} className="btn !min-h-9 !px-3 text-xs text-danger hover:bg-red-50"><Lock className="h-4 w-4" /> Close</button>
                </>
              )}
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-page p-4" aria-live="polite">
              {messages.map((m) =>
                m.senderType === "SYSTEM" ? (
                  <p key={m.id} className="text-center text-[11px] text-muted">{m.body} · {time(m.createdAt)}</p>
                ) : (
                  <div key={m.id} className={cn("flex", m.senderType === "STAFF" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm", m.senderType === "STAFF" ? "rounded-tr-sm bg-primary text-white" : "rounded-tl-sm bg-white")}>
                      {m.body}
                      <span className={cn("mt-1 block text-[10px]", m.senderType === "STAFF" ? "text-white/70" : "text-muted")}>
                        {m.senderType === "STAFF" ? m.staffName ?? "Staff" : detail.visitor.name ?? "Visitor"} · {time(m.createdAt)}
                      </span>
                    </div>
                  </div>
                ),
              )}
              <div ref={listEnd} />
            </div>
            {error && <p role="alert" className="border-t border-line bg-red-50 px-4 py-2 text-xs text-danger">{error}</p>}
            {canReply && !closed ? (
              <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
                <label htmlFor="reply" className="sr-only">Reply</label>
                <textarea
                  id="reply"
                  rows={2}
                  maxLength={2000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(e);
                    }
                  }}
                  placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
                  className="input min-h-11 resize-none py-2.5"
                />
                <button type="submit" className="btn-primary" disabled={sending || !text.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
                </button>
              </form>
            ) : (
              <p className="border-t border-line p-3 text-center text-xs text-muted">{closed ? "This conversation is closed." : "You have read-only chat access."}</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
