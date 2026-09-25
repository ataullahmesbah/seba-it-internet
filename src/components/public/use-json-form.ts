"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n/en";

type Status = "idle" | "submitting" | "success" | "error";

/** Posts JSON to a public /api/v1 endpoint and maps error codes to localized messages. */
export function useJsonForm(endpoint: string, dict: Dictionary) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const message = (code: string) => (dict.validation as Record<string, string>)[code] ?? dict.validation.required;

  async function submit(payload: Record<string, unknown>) {
    setStatus("submitting");
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setReference(json.data?.referenceCode ?? null);
        setStatus("success");
        return json.data;
      }
      const code = json?.error?.code;
      if (code === "VALIDATION_ERROR" && json.error.fields) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(json.error.fields as Record<string, string>)) mapped[k] = message(v);
        setErrors(mapped);
        setFormError(dict.forms.errorValidation);
      } else if (code === "RATE_LIMITED") setFormError(dict.forms.errorRate);
      else setFormError(dict.forms.errorGeneric);
      setStatus("error");
    } catch {
      setFormError(dict.forms.errorGeneric);
      setStatus("error");
    }
    return null;
  }

  function reset() {
    setStatus("idle");
    setErrors({});
    setFormError(null);
    setReference(null);
  }

  return { status, errors, formError, reference, submit, reset, setErrors };
}
