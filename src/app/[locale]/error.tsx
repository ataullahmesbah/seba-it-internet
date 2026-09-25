"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const COPY = {
  en: { title: "Something went wrong", body: "An unexpected error occurred. Please try again.", retry: "Try again", home: "Go home", ref: "Reference" },
  bn: { title: "কিছু একটা সমস্যা হয়েছে", body: "একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। আবার চেষ্টা করুন।", retry: "আবার চেষ্টা করুন", home: "হোমে যান", ref: "রেফারেন্স" },
};

/** Friendly error boundary — never shows a stack trace; shows digest as reference id. */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();
  const t = pathname?.startsWith("/bn") ? COPY.bn : COPY.en;
  useEffect(() => {
    console.error(error.digest ?? "client error");
  }, [error]);
  return (
    <section className="section">
      <div className="container-x flex flex-col items-center py-10 text-center">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t.title}</h1>
        <p className="mt-2 text-muted">{t.body}</p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted">
            {t.ref}: <code>{error.digest}</code>
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            {t.retry}
          </button>
          <a href={pathname?.startsWith("/bn") ? "/bn" : "/"} className="btn-outline">
            {t.home}
          </a>
        </div>
      </div>
    </section>
  );
}
