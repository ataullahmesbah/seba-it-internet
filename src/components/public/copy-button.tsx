"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary-soft"
      aria-label={done ? copiedLabel : `${label} ${value}`}
      title={done ? copiedLabel : label}
    >
      {done ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      <span className="sr-only" aria-live="polite">
        {done ? copiedLabel : ""}
      </span>
    </button>
  );
}

export function OpenChatButton({ label, className }: { label: React.ReactNode; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("open-chat"))}>
      {label}
    </button>
  );
}
