"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Search, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MediaSummary {
  id: string;
  url: string;
  filename: string;
  width?: number | null;
  height?: number | null;
  bytes?: number;
  category?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/** Signed Cloudinary upload: sign on our server → upload direct to Cloudinary → register (server verifies). */
export async function uploadToCloudinary(file: File, category: string, alt?: { en?: string; bn?: string }): Promise<MediaSummary> {
  if (!ACCEPT.split(",").includes(file.type)) throw new Error("Only JPEG, PNG, WebP or AVIF images are allowed.");
  const sign = await fetch("/api/v1/admin/media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category }) }).then((r) => r.json());
  if (!sign.success) throw new Error(sign.error?.message ?? "Uploads are not available.");
  const s = sign.data;
  if (file.size > s.maxBytes) throw new Error(`File is too large (max ${Math.round(s.maxBytes / 1024 / 1024)} MB).`);
  const fd = new FormData();
  fd.set("file", file);
  fd.set("api_key", s.apiKey);
  fd.set("timestamp", String(s.timestamp));
  fd.set("folder", s.folder);
  fd.set("allowed_formats", s.allowed_formats);
  fd.set("signature", s.signature);
  const up = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: "POST", body: fd }).then((r) => r.json());
  if (!up.public_id) throw new Error(up.error?.message ?? "Upload failed.");
  const reg = await fetch("/api/v1/admin/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId: up.public_id, version: up.version, signature: up.signature, category, filename: file.name, altEn: alt?.en, altBn: alt?.bn }),
  }).then((r) => r.json());
  if (!reg.success) throw new Error(reg.error?.message ?? "Could not register the upload.");
  return reg.data;
}

export function UploadButton({ category, onUploaded, className }: { category: string; onUploaded: (m: MediaSummary) => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={className}>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          setError(null);
          try {
            onUploaded(await uploadToCloudinary(f, category));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <button type="button" className="btn-primary !min-h-10" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload image
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/** Form field: select an asset from the library (or upload one). Stores the Media id in a hidden input. */
export function MediaPicker({ name, initial, category }: { name: string; initial: MediaSummary | null; category: string }) {
  const [value, setValue] = useState<MediaSummary | null>(initial);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaSummary[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadsEnabled, setUploadsEnabled] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/admin/media?pageSize=48${q ? `&q=${encodeURIComponent(q)}` : ""}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (res?.success) {
      setItems(res.data);
      setUploadsEnabled(Boolean(res.meta?.uploadsEnabled));
    }
    setLoading(false);
  }, [q]);

  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch from our API (external system); state is set after the response
      void load();
    }
  }, [open, load]);

  const choose = (m: MediaSummary | null) => {
    setValue(m);
    setOpen(false);
    dialog.current?.close();
    // Notify the parent form that it has unsaved changes.
    dialog.current?.closest("form")?.dispatchEvent(new Event("change", { bubbles: true }));
  };

  return (
    <div>
      <input type="hidden" name={name} value={value?.id ?? ""} />
      <div className="flex items-center gap-3">
        <div className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-slate-50">
          {value?.url ? <Image src={value.url} alt="" fill sizes="112px" className="object-cover" /> : <ImagePlus className="h-6 w-6 text-slate-400" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-outline !min-h-9 text-xs" onClick={() => setOpen(true)}>
            {value ? "Change" : "Choose image"}
          </button>
          {value && (
            <button type="button" className="btn !min-h-9 text-xs text-danger hover:bg-red-50" onClick={() => choose(null)}>
              Remove
            </button>
          )}
        </div>
        {value && <span className="truncate text-xs text-muted">{value.filename}</span>}
      </div>
      {open && (
        <dialog ref={dialog} onClose={() => setOpen(false)} className="m-auto w-[min(96vw,900px)] rounded-2xl p-0 shadow-2xl backdrop:bg-navy/50" aria-label="Media library">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <h2 className="flex-1 font-semibold">Media library</h2>
            {uploadsEnabled && <UploadButton category={category} onUploaded={(m) => choose(m)} />}
            <button type="button" onClick={() => { setOpen(false); dialog.current?.close(); }} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          {!uploadsEnabled && <p className="bg-amber-50 px-4 py-2 text-xs text-amber-900">Uploads are disabled until Cloudinary credentials are configured (CLOUDINARY_* environment variables).</p>}
          <div className="p-4">
            <div className="relative mb-4">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), load())} placeholder="Search filename or alt text…" className="input pl-9" aria-label="Search media" />
            </div>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No images yet.</p>
            ) : (
              <ul className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
                {items.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => choose(m)} className={cn("group relative block aspect-square w-full overflow-hidden rounded-xl border-2", value?.id === m.id ? "border-primary" : "border-transparent hover:border-primary/50")} title={m.filename}>
                      <Image src={m.url} alt={m.filename} fill sizes="150px" className="object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}

/** PDF field: paste an https link or upload a PDF to Cloudinary (raw, signed). Stores the URL. */
export function PdfField({ id, name, initial, invalid, describedBy }: { id: string; name: string; initial: string; invalid: boolean; describedBy?: string }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Please choose a PDF file.");
      const sign = await fetch("/api/v1/admin/media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "DOCUMENT" }) }).then((r) => r.json());
      if (!sign.success) throw new Error(sign.error?.message ?? "Uploads are not available. Paste a PDF link instead.");
      const s = sign.data;
      if (file.size > s.maxBytes) throw new Error(`File is too large (max ${Math.round(s.maxBytes / 1024 / 1024)} MB).`);
      const fd = new FormData();
      fd.set("file", file);
      fd.set("api_key", s.apiKey);
      fd.set("timestamp", String(s.timestamp));
      fd.set("folder", s.folder);
      fd.set("signature", s.signature);
      const up = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/raw/upload`, { method: "POST", body: fd }).then((r) => r.json());
      if (!up.public_id) throw new Error(up.error?.message ?? "Upload failed.");
      const reg = await fetch("/api/v1/admin/media/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: up.public_id, version: up.version, signature: up.signature }),
      }).then((r) => r.json());
      if (!reg.success) throw new Error(reg.error?.message ?? "Could not verify the upload.");
      setUrl(reg.data.url);
      input.current?.closest("form")?.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id={id} name={name} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… .pdf" inputMode="url" className="input" aria-invalid={invalid} aria-describedby={describedBy} />
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void upload(f);
          }}
        />
        <button type="button" className="btn-primary !min-h-11 shrink-0" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload PDF
        </button>
      </div>
      {url && /^https:\/\//.test(url) && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-medium text-primary underline">
          Open current PDF
        </a>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
