"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Copy, Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadButton, type MediaSummary } from "./media-picker";

interface Item extends MediaSummary {
  publicId: string;
  format: string;
  altEn: string | null;
  altBn: string | null;
  createdAt: string;
}

const CATS = ["", "LOGO", "HERO", "BLOG", "REVIEW", "OFFICE", "PAYMENT_QR", "GENERAL"];

export function MediaLibrary({ canManage, uploadsEnabled }: { canManage: boolean; uploadsEnabled: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<(Item & { references?: string[] }) | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/admin/media?page=${page}&pageSize=36${cat ? `&category=${cat}` : ""}`, { cache: "no-store" }).then((r) => r.json());
    if (res.success) {
      setItems(res.data);
      setTotal(res.meta.total);
    }
    setLoading(false);
  }, [cat, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch from our API (external system); state is set after the response
    void load();
  }, [load]);

  async function open(i: Item) {
    const res = await fetch(`/api/v1/admin/media/${i.id}`).then((r) => r.json());
    setSel(res.success ? res.data : i);
    setMsg(null);
  }

  async function saveAlt(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sel) return;
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/v1/admin/media/${sel.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ altEn: fd.get("altEn"), altBn: fd.get("altBn"), category: fd.get("category") }) }).then((r) => r.json());
    setMsg(res.success ? "Saved." : res.error?.message ?? "Failed.");
    void load();
  }

  async function remove() {
    if (!sel || !window.confirm(`Delete “${sel.filename}”? The file is removed from Cloudinary permanently.`)) return;
    const res = await fetch(`/api/v1/admin/media/${sel.id}`, { method: "DELETE" }).then((r) => r.json());
    if (res.success) {
      setSel(null);
      void load();
    } else setMsg(res.error?.message ?? "Delete failed.");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATS.map((c) => (
          <button key={c} type="button" onClick={() => { setCat(c); setPage(1); }} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", cat === c ? "bg-primary text-white" : "bg-white ring-1 ring-line")}>
            {c ? c.replace("_", " ") : "All"}
          </button>
        ))}
        <span className="flex-1" />
        {uploadsEnabled ? <UploadButton category={cat || "GENERAL"} onUploaded={() => load()} /> : <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Configure CLOUDINARY_* environment variables to enable uploads.</p>}
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="card py-16 text-center text-sm text-muted">No images in this category yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => open(i)} className="card group block w-full overflow-hidden text-left">
                <span className="relative block aspect-square bg-slate-100">
                  <Image src={i.url} alt={i.altEn ?? ""} fill sizes="200px" className="object-cover" />
                </span>
                <span className="block truncate px-2 py-1.5 text-xs">{i.filename}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {total > 36 && (
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-outline !min-h-9">Previous</button>
          <button type="button" disabled={page * 36 >= total} onClick={() => setPage((p) => p + 1)} className="btn-outline !min-h-9">Next</button>
        </div>
      )}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4" role="dialog" aria-modal="true" aria-label="Media details">
          <div className="grid max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl md:grid-cols-2">
            <div className="relative min-h-64 bg-slate-100">
              <Image src={sel.url} alt={sel.altEn ?? ""} fill sizes="400px" className="object-contain" />
            </div>
            <form onSubmit={saveAlt} className="space-y-3 p-5">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold break-all">{sel.filename}</h2>
                <button type="button" onClick={() => setSel(null)} className="rounded p-1 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
              </div>
              <dl className="grid grid-cols-2 gap-1 text-xs text-muted">
                <dt>Dimensions</dt><dd>{sel.width}×{sel.height}</dd>
                <dt>Size</dt><dd>{Math.round((sel.bytes ?? 0) / 1024)} KB</dd>
                <dt>Format</dt><dd>{sel.format}</dd>
                <dt>Public ID</dt><dd className="break-all">{sel.publicId}</dd>
              </dl>
              <p className="text-xs"><span className="font-semibold">Used in:</span> {sel.references?.length ? sel.references.join(", ") : "Not referenced"}</p>
              <button type="button" onClick={() => navigator.clipboard?.writeText(sel.url)} className="btn-outline !min-h-8 text-xs"><Copy className="h-3.5 w-3.5" /> Copy URL</button>
              <div>
                <label htmlFor="altEn" className="label">Alt text (English)</label>
                <input id="altEn" name="altEn" defaultValue={sel.altEn ?? ""} className="input" maxLength={200} disabled={!canManage} />
              </div>
              <div>
                <label htmlFor="altBn" className="label">Alt text (বাংলা)</label>
                <input id="altBn" name="altBn" lang="bn" defaultValue={sel.altBn ?? ""} className="input" maxLength={200} disabled={!canManage} />
              </div>
              <div>
                <label htmlFor="category" className="label">Category</label>
                <select id="category" name="category" defaultValue={sel.category} className="input" disabled={!canManage}>
                  {CATS.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
              {canManage && (
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-primary flex-1">Save</button>
                  <button type="button" onClick={remove} className="btn-danger" disabled={Boolean(sel.references?.length)} title={sel.references?.length ? "In use — replace references first" : "Delete"}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
