"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { fmt } from "@/lib/i18n/index-client";
import type { AppLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/en";
import { Field, FormAlert, Honeypot, SubmitButton, SuccessPanel, formToObject } from "./form-fields";
import { useJsonForm } from "./use-json-form";
import { useLocation, locName, type Loc } from "./location-selects";
import { TurnstileSlot } from "./turnstile";

const selectCls = "input";

function Success({ dict, reference, onReset }: { dict: Dictionary; reference: string | null; onReset: () => void }) {
  return (
    <SuccessPanel
      title={dict.forms.successTitle}
      body={fmt(dict.forms.successBody, { code: reference ?? "—" })}
      action={
        <button type="button" onClick={onReset} className="btn-outline">
          {dict.forms.submitAnother}
        </button>
      }
    />
  );
}

function readUtm(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  const sp = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = sp.get(k);
    if (v) out[k] = v.slice(0, 100);
  }
  return Object.keys(out).length ? out : undefined;
}

// ───────────── Get Connection (PRD 5.10) ─────────────

export interface PackageOption {
  id: string;
  label: string;
}

export function ConnectionForm({
  districts,
  packages,
  locale,
  dict,
  initialPackageId,
  initialService = "HOME",
  compact,
}: {
  districts: Loc[];
  packages: PackageOption[];
  locale: AppLocale;
  dict: Dictionary;
  initialPackageId?: string;
  initialService?: "HOME" | "CORPORATE";
  compact?: boolean;
}) {
  const f = useJsonForm("/api/v1/public/connections", dict);
  const loc = useLocation(districts);
  const [service, setService] = useState<"HOME" | "CORPORATE">(initialService);
  const [packageId, setPackageId] = useState(initialPackageId && packages.some((p) => p.id === initialPackageId) ? initialPackageId : "");
  const t = dict.forms;

  if (f.status === "success") return <Success dict={dict} reference={f.reference} onReset={f.reset} />;

  // Areas list only contains active coverage; if a visitor picked a thana with no active areas we warn.
  const noCoverage = Boolean(loc.value.thanaId && loc.loading === null && loc.areas.length === 0);

  return (
    <form
      noValidate
      className="relative grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const o = formToObject(e.currentTarget);
        void f.submit({ ...o, ...loc.value, serviceType: service, packageId: service === "HOME" ? packageId : "", consent: o.consent === "on", locale, utm: readUtm() });
      }}
    >
      <Honeypot />
      <Field label={t.name} name="name" error={f.errors.name} required>
        {(p) => <input {...p} className="input" maxLength={100} autoComplete="name" placeholder={t.namePh} />}
      </Field>
      <Field label={t.phone} name="phone" error={f.errors.phone} required>
        {(p) => <input {...p} className="input" inputMode="tel" autoComplete="tel" placeholder={t.phonePh} />}
      </Field>
      {!compact && (
        <Field label={t.email} name="email" error={f.errors.email} className="sm:col-span-2">
          {(p) => <input {...p} type="email" className="input" maxLength={254} autoComplete="email" placeholder={t.emailPh} />}
        </Field>
      )}
      <Field label={t.district} name="districtId" error={f.errors.districtId} required>
        {(p) => (
          <select {...p} className={selectCls} value={loc.value.districtId} onChange={(e) => loc.setDistrict(e.target.value)}>
            <option value="">{t.select}</option>
            {loc.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {locName(d, locale)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t.thana} name="thanaId" error={f.errors.thanaId} required>
        {(p) => (
          <select {...p} className={selectCls} value={loc.value.thanaId} disabled={!loc.value.districtId} onChange={(e) => loc.setThana(e.target.value)}>
            <option value="">{t.select}</option>
            {loc.thanas.map((d) => (
              <option key={d.id} value={d.id}>
                {locName(d, locale)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t.area} name="areaId" error={f.errors.areaId} required className={compact ? "" : "sm:col-span-2"}>
        {(p) => (
          <select {...p} className={selectCls} value={loc.value.areaId} disabled={!loc.value.thanaId} onChange={(e) => loc.setArea(e.target.value)}>
            <option value="">{t.select}</option>
            {loc.areas.map((d) => (
              <option key={d.id} value={d.id}>
                {locName(d, locale)}
              </option>
            ))}
          </select>
        )}
      </Field>
      {noCoverage && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-warning sm:col-span-2" role="status">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {t.unavailableWarning}
        </p>
      )}
      {compact && (
        <Field label={t.service} name="serviceType" error={f.errors.serviceType} required>
          {(p) => (
            <select {...p} className={selectCls} value={service} onChange={(e) => setService(e.target.value as "HOME" | "CORPORATE")}>
              <option value="HOME">{t.serviceHome}</option>
              <option value="CORPORATE">{t.serviceCorporate}</option>
            </select>
          )}
        </Field>
      )}
      <Field label={t.fullAddress} name="fullAddress" error={f.errors.fullAddress} required className="sm:col-span-2">
        {(p) => <input {...p} className="input" maxLength={500} autoComplete="street-address" placeholder={t.fullAddressPh} />}
      </Field>
      {!compact && (
        <fieldset className="sm:col-span-2">
          <legend className="label">
            {t.service} <span className="text-danger">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {(["HOME", "CORPORATE"] as const).map((v) => (
              <label key={v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium ${service === v ? "border-primary bg-primary-soft text-primary" : "border-line bg-white"}`}>
                <input type="radio" name="serviceTypeRadio" value={v} checked={service === v} onChange={() => setService(v)} className="accent-[var(--brand-primary)]" />
                {v === "HOME" ? t.serviceHome : t.serviceCorporate}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {service === "HOME" && (
        <Field label={t.package} name="packageId" error={f.errors.packageId} className={compact ? "" : "sm:col-span-2"}>
          {(p) => (
            <select {...p} className={selectCls} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              <option value="">{t.packagePh}</option>
              {packages.map((pk) => (
                <option key={pk.id} value={pk.id}>
                  {pk.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      {!compact && (
        <Field label={t.additionalMessage} name="message" error={f.errors.message} className="sm:col-span-2">
          {(p) => <textarea {...p} className="input min-h-24 py-2.5" maxLength={2000} placeholder={t.messagePh} />}
        </Field>
      )}
      <div className="sm:col-span-2">
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-[var(--brand-primary)]" aria-invalid={Boolean(f.errors.consent)} />
          <span>{t.consent}</span>
        </label>
        {f.errors.consent && <p className="field-error">{f.errors.consent}</p>}
      </div>
      <TurnstileSlot />
      <div className="grid gap-3 sm:col-span-2">
        <FormAlert message={f.formError} />
        <SubmitButton busy={f.status === "submitting"} label={t.submitRequest} busyLabel={dict.common.submitting} />
        <p className="text-center text-xs text-muted">{t.responseNote}</p>
      </div>
    </form>
  );
}

// ───────────── Corporate inquiry (PRD 5.3) ─────────────

export function CorporateForm({ districts, locale, dict }: { districts: Loc[]; locale: AppLocale; dict: Dictionary }) {
  const f = useJsonForm("/api/v1/public/corporate-inquiries", dict);
  const loc = useLocation(districts);
  const t = dict.forms;
  if (f.status === "success") return <Success dict={dict} reference={f.reference} onReset={f.reset} />;
  return (
    <form
      noValidate
      className="relative grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const o = formToObject(e.currentTarget);
        void f.submit({ ...o, districtId: loc.value.districtId, thanaId: loc.value.thanaId, consent: o.consent === "on", locale });
      }}
    >
      <Honeypot />
      <Field label={t.companyName} name="companyName" error={f.errors.companyName} required>
        {(p) => <input {...p} className="input" maxLength={150} autoComplete="organization" placeholder={t.companyNamePh} />}
      </Field>
      <Field label={t.contactPerson} name="contactPerson" error={f.errors.contactPerson} required>
        {(p) => <input {...p} className="input" maxLength={100} autoComplete="name" placeholder={t.contactPersonPh} />}
      </Field>
      <Field label={t.email} name="email" error={f.errors.email} required>
        {(p) => <input {...p} type="email" className="input" maxLength={254} autoComplete="email" placeholder="you@company.com" />}
      </Field>
      <Field label={t.phone} name="phone" error={f.errors.phone} required>
        {(p) => <input {...p} className="input" inputMode="tel" autoComplete="tel" placeholder={t.phonePh} />}
      </Field>
      <Field label={t.district} name="districtId" error={f.errors.districtId}>
        {(p) => (
          <select {...p} className={selectCls} value={loc.value.districtId} onChange={(e) => loc.setDistrict(e.target.value)}>
            <option value="">{t.select}</option>
            {loc.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {locName(d, locale)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t.thana} name="thanaId" error={f.errors.thanaId}>
        {(p) => (
          <select {...p} className={selectCls} value={loc.value.thanaId} disabled={!loc.value.districtId} onChange={(e) => loc.setThana(e.target.value)}>
            <option value="">{t.select}</option>
            {loc.thanas.map((d) => (
              <option key={d.id} value={d.id}>
                {locName(d, locale)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label={t.officeAddress} name="officeAddress" error={f.errors.officeAddress} required className="sm:col-span-2">
        {(p) => <textarea {...p} className="input min-h-20 py-2.5" maxLength={500} placeholder={t.officeAddressPh} />}
      </Field>
      <Field label={t.bandwidth} name="requiredBandwidth" error={f.errors.requiredBandwidth}>
        {(p) => <input {...p} className="input" maxLength={100} placeholder={t.bandwidthPh} />}
      </Field>
      <Field label={t.users} name="numberOfUsers" error={f.errors.numberOfUsers}>
        {(p) => <input {...p} type="number" min={1} className="input" placeholder={t.usersPh} />}
      </Field>
      <Field label={t.message} name="message" error={f.errors.message} className="sm:col-span-2">
        {(p) => <textarea {...p} className="input min-h-24 py-2.5" maxLength={2000} placeholder={t.messagePh} />}
      </Field>
      <div className="sm:col-span-2">
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" name="consent" className="mt-1 h-4 w-4 accent-[var(--brand-primary)]" />
          <span>{t.consent}</span>
        </label>
        {f.errors.consent && <p className="field-error">{f.errors.consent}</p>}
      </div>
      <TurnstileSlot />
      <div className="grid gap-3 sm:col-span-2">
        <FormAlert message={f.formError} />
        <SubmitButton busy={f.status === "submitting"} label={t.submitInquiry} busyLabel={dict.common.submitting} />
      </div>
    </form>
  );
}

// ───────────── Contact (PRD 5.9) ─────────────

export function ContactForm({ locale, dict }: { locale: AppLocale; dict: Dictionary }) {
  const f = useJsonForm("/api/v1/public/contact", dict);
  const t = dict.forms;
  if (f.status === "success") return <Success dict={dict} reference={f.reference} onReset={f.reset} />;
  return (
    <form
      noValidate
      className="relative grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void f.submit({ ...formToObject(e.currentTarget), locale });
      }}
    >
      <Honeypot />
      <Field label={t.name} name="name" error={f.errors.name} required>
        {(p) => <input {...p} className="input" maxLength={100} autoComplete="name" placeholder={t.namePh} />}
      </Field>
      <Field label={t.phone} name="phone" error={f.errors.phone} required>
        {(p) => <input {...p} className="input" inputMode="tel" autoComplete="tel" placeholder={t.phonePh} />}
      </Field>
      <Field label={t.email} name="email" error={f.errors.email} className="sm:col-span-2">
        {(p) => <input {...p} type="email" className="input" maxLength={254} autoComplete="email" placeholder={t.emailPh} />}
      </Field>
      <Field label={t.subject} name="subject" error={f.errors.subject} required className="sm:col-span-2">
        {(p) => <input {...p} className="input" maxLength={150} placeholder={t.subjectPh} />}
      </Field>
      <Field label={t.message} name="message" error={f.errors.message} required className="sm:col-span-2">
        {(p) => <textarea {...p} className="input min-h-32 py-2.5" maxLength={2000} placeholder={t.messagePh} />}
      </Field>
      <TurnstileSlot />
      <div className="grid gap-3 sm:col-span-2">
        <FormAlert message={f.formError} />
        <SubmitButton busy={f.status === "submitting"} label={t.sendMessage} busyLabel={dict.common.submitting} />
      </div>
    </form>
  );
}
