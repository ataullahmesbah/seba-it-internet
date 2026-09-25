"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Loader2, Plus, Quote, Trash2, ArrowUp, ArrowDown, Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldDef, SelectOption } from "@/features/fields";
import { Icon } from "@/components/ui/icon";
import { MediaPicker, PdfField, type MediaSummary } from "./media-picker";
import { ReauthCard } from "./reauth-card";

export interface FormState {
  errors?: Record<string, string>;
  error?: string;
  message?: string;
  reauth?: boolean;
}

type Values = Record<string, unknown>;

function strVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function SoftCounter({ value, softMax, max }: { value: string; softMax?: number; max?: number }) {
  if (!softMax && !max) return null;
  const over = softMax && value.length > softMax;
  return (
    <span className={cn("text-[11px]", over ? "font-semibold text-warning" : "text-muted")}>
      {value.length}
      {softMax ? ` / ${softMax} recommended` : max ? ` / ${max}` : ""}
    </span>
  );
}

function RichTextInput({ name, id, defaultValue, lang, invalid }: { name: string; id: string; defaultValue: string; lang?: string; invalid: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const wrap = (before: string, after = "") => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = value.slice(s, e) || "text";
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };
  const tools: Array<[React.ReactNode, string, string, string]> = [
    [<Bold key="b" className="h-4 w-4" />, "Bold", "<strong>", "</strong>"],
    [<Italic key="i" className="h-4 w-4" />, "Italic", "<em>", "</em>"],
    [<Heading2 key="h2" className="h-4 w-4" />, "Heading 2", "<h2>", "</h2>"],
    [<Heading3 key="h3" className="h-4 w-4" />, "Heading 3", "<h3>", "</h3>"],
    [<List key="ul" className="h-4 w-4" />, "Bullet list", "<ul>\n  <li>", "</li>\n</ul>"],
    [<ListOrdered key="ol" className="h-4 w-4" />, "Numbered list", "<ol>\n  <li>", "</li>\n</ol>"],
    [<Quote key="q" className="h-4 w-4" />, "Quote", "<blockquote>", "</blockquote>"],
    [<Link2 key="a" className="h-4 w-4" />, "Link", "LINK", ""],
  ];
  const applyTool = (before: string, after: string) => {
    if (before !== "LINK") return wrap(before, after);
    const url = window.prompt("Link URL (https://...)");
    if (url && /^(https:\/\/|\/|mailto:|tel:)/.test(url)) wrap(`<a href="${url.replace(/"/g, "")}">`, "</a>");
  };
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-white", invalid ? "border-danger" : "border-line")}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-slate-50 px-2 py-1">
        {tools.map(([icon, label, before, after]) => (
          <button key={label} type="button" onClick={() => applyTool(before, after)} disabled={preview} className="rounded p-1.5 text-slate-600 hover:bg-white disabled:opacity-40" title={label} aria-label={label}>
            {icon}
          </button>
        ))}
        <span className="flex-1" />
        <button type="button" onClick={() => setPreview((p) => !p)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-white">
          {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {preview ? "Edit" : "Preview"}
        </button>
      </div>
      <textarea
        ref={ref}
        id={id}
        name={name}
        lang={lang}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn("block min-h-64 w-full resize-y p-3 font-mono text-[13px] leading-6 outline-none", preview && "hidden")}
        aria-invalid={invalid}
      />
      {preview && <div className="prose-content min-h-64 p-4" lang={lang} dangerouslySetInnerHTML={{ __html: value }} />}
      <p className="border-t border-line bg-slate-50 px-3 py-1.5 text-[11px] text-muted">HTML is sanitized on save: scripts, iframes, styles and event handlers are removed.</p>
    </div>
  );
}

interface RepeaterRow {
  [k: string]: string;
}

function RepeaterInput({ field, name, initial, options }: { field: FieldDef; name: string; initial: RepeaterRow[]; options: Record<string, SelectOption[]> }) {
  const [rows, setRows] = useState<RepeaterRow[]>(initial);
  const sub = field.fields ?? [];
  const keysOf = (f: FieldDef) => (f.bilingual ? [f.name + "En", f.name + "Bn"] : [f.name]);
  const emptyRow = () => Object.fromEntries(sub.flatMap(keysOf).map((k) => [k, ""]));
  const update = (i: number, k: string, v: string) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const n = [...r];
      const j = i + d;
      if (j < 0 || j >= n.length) return r;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-line bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">#{i + 1}</span>
            <span className="flex gap-1">
              <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-white" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-white" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="rounded p-1 text-danger hover:bg-white" aria-label="Remove row"><Trash2 className="h-3.5 w-3.5" /></button>
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sub.flatMap((sf) =>
              keysOf(sf).map((k) => {
                const label = sf.label + (sf.bilingual ? (k.endsWith("Bn") ? " (বাংলা)" : " (EN)") : "");
                const id = `${name}-${i}-${k}`;
                if (sf.type === "icon" || sf.type === "select") {
                  const opts = sf.options ?? options[sf.optionsKey ?? ""] ?? [];
                  return (
                    <div key={k}>
                      <label htmlFor={id} className="mb-1 block text-xs font-medium">{label}</label>
                      <div className="flex items-center gap-2">
                        {sf.type === "icon" && <Icon name={row[k]} className="h-5 w-5 shrink-0 text-primary" />}
                        <select id={id} value={row[k] ?? ""} onChange={(e) => update(i, k, e.target.value)} className="input !min-h-9 text-xs">
                          <option value="">—</option>
                          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={k} className={sf.type === "textarea" ? "sm:col-span-1" : ""}>
                    <label htmlFor={id} className="mb-1 block text-xs font-medium">{label}{sf.required && <span className="text-danger"> *</span>}</label>
                    {sf.type === "textarea" ? (
                      <textarea id={id} lang={k.endsWith("Bn") ? "bn" : undefined} value={row[k] ?? ""} onChange={(e) => update(i, k, e.target.value)} className="input min-h-16 py-2 text-xs" maxLength={sf.max} />
                    ) : (
                      <input id={id} lang={k.endsWith("Bn") ? "bn" : undefined} value={row[k] ?? ""} onChange={(e) => update(i, k, e.target.value)} className="input !min-h-9 text-xs" maxLength={sf.max} />
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      ))}
      {(!field.maxItems || rows.length < field.maxItems) && (
        <button type="button" onClick={() => setRows((r) => [...r, emptyRow()])} className="btn-outline !min-h-9 text-xs">
          <Plus className="h-4 w-4" /> Add item
        </button>
      )}
    </div>
  );
}

function SingleInput({
  field,
  name,
  value,
  error,
  options,
  media,
  lang,
  labelSuffix,
}: {
  field: FieldDef;
  name: string;
  value: unknown;
  error?: string;
  options: Record<string, SelectOption[]>;
  media: Record<string, MediaSummary>;
  lang?: string;
  labelSuffix?: string;
}) {
  const id = `f-${name}`;
  const [text, setText] = useState(strVal(value));
  const common = { id, name, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-err` : field.help ? `${id}-help` : undefined, lang };
  const label = field.label + (labelSuffix ?? "");
  let input: React.ReactNode;
  switch (field.type) {
    case "checkbox":
      return (
        <div className={field.width === "half" ? "" : "sm:col-span-2"}>
          <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" name={name} defaultChecked={Boolean(value)} className="h-4 w-4 accent-[var(--brand-primary)]" />
            {label}
          </label>
          {field.help && <p className="text-xs text-muted">{field.help}</p>}
          {error && <p className="field-error">{error}</p>}
        </div>
      );
    case "textarea":
      input = <textarea {...common} value={text} onChange={(e) => setText(e.target.value)} maxLength={field.max} className="input min-h-24 py-2.5" />;
      break;
    case "richtext":
      input = <RichTextInput id={id} name={name} defaultValue={strVal(value)} lang={lang} invalid={Boolean(error)} />;
      break;
    case "lines":
      input = <textarea {...common} defaultValue={Array.isArray(value) ? (value as string[]).join("\n") : ""} className="input min-h-28 py-2.5" />;
      break;
    case "number":
      input = <input {...common} type="number" step="any" defaultValue={strVal(value)} min={field.min} max={field.max} className="input" />;
      break;
    case "datetime":
      input = <input {...common} type="datetime-local" defaultValue={strVal(value)} className="input" />;
      break;
    case "color":
      input = (
        <div className="flex items-center gap-2">
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(text) ? text : "#000000"} onChange={(e) => setText(e.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-lg border border-line" aria-label={`${label} picker`} />
          <input {...common} value={text} onChange={(e) => setText(e.target.value)} className="input font-mono" maxLength={7} placeholder="#0A66FF" />
        </div>
      );
      break;
    case "select":
    case "icon": {
      const opts = field.options ?? options[field.optionsKey ?? ""] ?? [];
      input = (
        <div className="flex items-center gap-2">
          {field.type === "icon" && <Icon name={text} className="h-6 w-6 shrink-0 text-primary" />}
          <select {...common} value={text} onChange={(e) => setText(e.target.value)} className="input">
            {!field.required || !text ? <option value="">— Select —</option> : null}
            {opts.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
      break;
    }
    case "media":
      input = <MediaPicker name={name} initial={value ? media[String(value)] ?? { id: String(value), url: "", filename: "Selected image" } : null} category={field.mediaCategory ?? "GENERAL"} />;
      break;
    case "repeater":
      input = <RepeaterInput field={field} name={name} initial={Array.isArray(value) ? (value as RepeaterRow[]) : []} options={options} />;
      break;
    case "pdf":
      input = <PdfField id={id} name={name} initial={strVal(value)} invalid={Boolean(error)} describedBy={common["aria-describedby"]} />;
      break;
    case "password":
      input = <input {...common} type="password" autoComplete="new-password" className="input" maxLength={128} />;
      break;
    default:
      input = (
        <input
          {...common}
          type={field.type === "email" ? "email" : field.type === "url" ? "text" : "text"}
          inputMode={field.type === "url" ? "url" : undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={field.max}
          placeholder={field.placeholder}
          className="input"
        />
      );
  }
  const wide = field.width !== "half" || ["richtext", "repeater", "lines"].includes(field.type);
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="flex items-end justify-between gap-2">
        <label htmlFor={id} className="label">
          {label}
          {field.required && <span className="text-danger"> *</span>}
        </label>
        {(field.type === "text" || field.type === "textarea") && field.softMax ? <SoftCounter value={text} softMax={field.softMax} /> : null}
      </div>
      {input}
      {error ? (
        <p id={`${id}-err`} className="field-error">{error}</p>
      ) : field.help ? (
        <p id={`${id}-help`} className="mt-1 text-xs text-muted">{field.help}</p>
      ) : null}
    </div>
  );
}

export function FieldsGrid({ fields, values, errors, options, media }: { fields: FieldDef[]; values: Values; errors: Record<string, string>; options: Record<string, SelectOption[]>; media: Record<string, MediaSummary> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((f) => {
        if (!f.bilingual) return <SingleInput key={f.name} field={f} name={f.name} value={values[f.name]} error={errors[f.name]} options={options} media={media} />;
        const wide = !["text"].includes(f.type) || f.width !== "half";
        return (
          <fieldset key={f.name} className={cn("grid gap-4 rounded-xl border border-line/70 p-3 sm:grid-cols-2", wide && "sm:col-span-2")}>
            <legend className="px-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{f.label} · EN / বাংলা</legend>
            <div className="grid sm:col-span-1 [&>div]:sm:col-span-2">
              <SingleInput field={f} name={f.name + "En"} value={values[f.name + "En"]} error={errors[f.name + "En"]} options={options} media={media} labelSuffix=" (English)" />
            </div>
            <div className="grid sm:col-span-1 [&>div]:sm:col-span-2">
              <SingleInput field={{ ...f, required: f.required && !f.bnOptional }} name={f.name + "Bn"} value={values[f.name + "Bn"]} error={errors[f.name + "Bn"]} options={options} media={media} lang="bn" labelSuffix=" (বাংলা)" />
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export function ResourceForm({
  action,
  fields,
  values,
  options = {},
  media = {},
  cancelHref,
  submitLabel = "Save",
  needsReauth,
  aside,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  fields: FieldDef[];
  values: Values;
  options?: Record<string, SelectOption[]>;
  media?: Record<string, MediaSummary>;
  cancelHref?: string;
  submitLabel?: string;
  needsReauth?: boolean;
  aside?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [dirty, setDirty] = useState(false);
  const errors = useMemo(() => state.errors ?? {}, [state.errors]);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  useEffect(() => {
    if (state.error) summaryRef.current?.focus();
  }, [state]);

  return (
    <div className="space-y-4">
      {(state.reauth || needsReauth) && <ReauthCard />}
      <form
        onSubmit={(e) => {
          // Submit without React's automatic form reset so values survive validation errors.
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setDirty(false);
          startTransition(() => formAction(fd));
        }}
        onChange={() => setDirty(true)}
        className="grid gap-6 lg:grid-cols-[1fr_280px]"
      >
        <div className="card space-y-5 p-5 sm:p-6">
          <div ref={summaryRef} tabIndex={-1} className="outline-none">
            {state.error && (
              <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
                <p className="font-semibold">{state.error}</p>
                {Object.keys(errors).length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-xs">
                    {Object.entries(errors).map(([k, v]) => (
                      <li key={k}>
                        <a href={`#f-${k}`} className="underline">{v}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {state.message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.message}</p>}
          </div>
          <FieldsGrid fields={fields} values={values} errors={errors} options={options} media={media} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-3 p-5">
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
            </button>
            {cancelHref && (
              <Link href={cancelHref} className="btn-outline w-full">
                Cancel
              </Link>
            )}
            {dirty && <p className="text-center text-xs text-warning">You have unsaved changes.</p>}
          </div>
          {aside}
        </aside>
      </form>
    </div>
  );
}
