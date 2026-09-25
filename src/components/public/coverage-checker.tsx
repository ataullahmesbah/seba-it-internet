"use client";

import Link from "@/components/public/link";
import { useState } from "react";
import { ArrowRight, CircleCheck, CircleX, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/i18n/index-client";
import { localizedHref, type AppLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";
import { useLocation, locName, type Loc } from "./location-selects";
import { useJsonForm } from "./use-json-form";
import { Field, FormAlert, Honeypot, SubmitButton } from "./form-fields";
import { TurnstileSlot } from "./turnstile";

type Result = { available: boolean; label: string; note?: string } | null;

export function CoverageChecker({
  districts,
  locale,
  dict,
  title,
  subtitle,
  compact,
}: {
  districts: Loc[];
  locale: AppLocale;
  dict: Dictionary;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const loc = useLocation(districts);
  const [result, setResult] = useState<Result>(null);
  const [notListed, setNotListed] = useState(false);
  const t = dict.coverage;
  const complete = Boolean(loc.value.districtId && loc.value.thanaId && loc.value.areaId);

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    const area = loc.areas.find((a) => a.id === loc.value.areaId) as (Loc & { publicNoteEn?: string; publicNoteBn?: string }) | undefined;
    const thana = loc.thanas.find((a) => a.id === loc.value.thanaId);
    // Only active areas are returned by the API, so a found area is covered.
    setResult({
      available: Boolean(area),
      label: [locName(area, locale), locName(thana, locale)].filter(Boolean).join(", "),
      note: (locale === "bn" ? area?.publicNoteBn : area?.publicNoteEn) ?? undefined,
    });
    setNotListed(false);
  }

  const selectCls = "input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2364748b%22><path d=%22M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z%22/></svg>')] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat pr-9";

  return (
    <div className={cn("card relative p-5 sm:p-7", compact && "shadow-[var(--shadow-lift)]")}>
      {title && (
        <div className="mb-5">
          <h2 className="text-xl font-bold text-ink sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      )}
      <form onSubmit={check} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <div>
          <label htmlFor="cov-d" className="label">
            {t.district}
          </label>
          <select id="cov-d" className={selectCls} value={loc.value.districtId} onChange={(e) => { loc.setDistrict(e.target.value); setResult(null); }}>
            <option value="">{t.chooseDistrict}</option>
            {loc.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {locName(d, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cov-t" className="label">
            {t.thana}
          </label>
          <select id="cov-t" className={selectCls} value={loc.value.thanaId} disabled={!loc.value.districtId || loc.loading === "thana"} onChange={(e) => { loc.setThana(e.target.value); setResult(null); }}>
            <option value="">{t.chooseThana}</option>
            {loc.thanas.map((d) => (
              <option key={d.id} value={d.id}>
                {locName(d, locale)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cov-a" className="label">
            {t.area}
          </label>
          <select id="cov-a" className={selectCls} value={loc.value.areaId} disabled={!loc.value.thanaId || loc.loading === "area"} onChange={(e) => { loc.setArea(e.target.value); setResult(null); }}>
            <option value="">{t.chooseArea}</option>
            {loc.areas.map((d) => (
              <option key={d.id} value={d.id}>
                {locName(d, locale)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary md:min-w-44" disabled={!complete}>
          <Search className="h-4 w-4" aria-hidden /> {t.check}
        </button>
      </form>
      <button type="button" onClick={() => { setNotListed(true); setResult(null); }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
        <MapPin className="h-3.5 w-3.5" aria-hidden /> {t.areaNotListed}
      </button>

      <div aria-live="polite">
        {result?.available && (
          <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <CircleCheck className="h-7 w-7 shrink-0 text-success" aria-hidden />
              <div>
                <p className="font-bold text-ink">{t.availableTitle}</p>
                <p className="text-sm text-slate-700">{fmt(t.availableBody, { area: result.label })}</p>
                {result.note && <p className="mt-1 text-xs text-muted">{result.note}</p>}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href={localizedHref("/packages", locale)} className="btn-outline !min-h-10">
                {dict.common.viewPackages}
              </Link>
              <Link href={localizedHref("/get-connection", locale)} className="btn-primary !min-h-10">
                {dict.common.getConnection} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        )}
        {(notListed || (result && !result.available)) && (
          <div className="mt-5 rounded-2xl bg-amber-50 p-5">
            <div className="flex gap-3">
              <CircleX className="h-7 w-7 shrink-0 text-warning" aria-hidden />
              <div>
                <p className="font-bold text-ink">{t.unavailableTitle}</p>
                <p className="text-sm text-slate-700">{fmt(t.unavailableBody, { area: result?.label || "—" })}</p>
              </div>
            </div>
            <NotifyMeForm locale={locale} dict={dict} location={loc.value} freeText={notListed} />
          </div>
        )}
      </div>
    </div>
  );
}

function NotifyMeForm({ locale, dict, location, freeText }: { locale: AppLocale; dict: Dictionary; location: { districtId: string; thanaId: string; areaId: string }; freeText: boolean }) {
  const f = useJsonForm("/api/v1/public/coverage-interest", dict);
  const t = dict.coverage;
  if (f.status === "success") {
    return (
      <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-success">
        <CircleCheck className="h-4 w-4" aria-hidden /> {t.notifySuccess}
      </p>
    );
  }
  return (
    <form
      className="relative mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        void f.submit({
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          website: fd.get("website"),
          freeTextArea: fd.get("freeTextArea") ?? undefined,
          turnstileToken: fd.get("turnstileToken") ?? undefined,
          ...location,
          locale,
        });
      }}
    >
      <Honeypot />
      {freeText && (
        <Field label={dict.forms.fullAddress} name="freeTextArea" error={f.errors.freeTextArea} className="sm:col-span-2 lg:col-span-4">
          {(p) => <input {...p} className="input" maxLength={200} placeholder={dict.forms.fullAddressPh} />}
        </Field>
      )}
      <Field label={t.notifyName} name="name" error={f.errors.name}>
        {(p) => <input {...p} className="input" maxLength={100} autoComplete="name" />}
      </Field>
      <Field label={t.notifyPhone} name="phone" error={f.errors.phone} required>
        {(p) => <input {...p} className="input" inputMode="tel" autoComplete="tel" placeholder={dict.forms.phonePh} />}
      </Field>
      <Field label={t.notifyEmail} name="email" error={f.errors.email}>
        {(p) => <input {...p} type="email" className="input" autoComplete="email" />}
      </Field>
      <TurnstileSlot />
      <SubmitButton busy={f.status === "submitting"} label={t.notifyMe} busyLabel={dict.common.submitting} />
      <div className="sm:col-span-2 lg:col-span-4">
        <FormAlert message={f.formError} />
      </div>
    </form>
  );
}
