"use client";

import { createContext, useContext, useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void };
  }
}

const TurnstileContext = createContext<string | null>(null);

/** Provides the (public) Turnstile site key when the anti-bot policy is enabled. */
export function TurnstileProvider({ siteKey, children }: { siteKey: string | null; children: React.ReactNode }) {
  return <TurnstileContext.Provider value={siteKey}>{children}</TurnstileContext.Provider>;
}

/** Explicitly rendered widget; writes its token into a hidden `turnstileToken` input of the enclosing form. */
export function TurnstileSlot() {
  const siteKey = useContext(TurnstileContext);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!siteKey || !box.current) return;
    let id: string | null = null;
    let tries = 0;
    const timer = setInterval(() => {
      if (window.turnstile && box.current) {
        clearInterval(timer);
        id = window.turnstile.render(box.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (input.current) input.current.value = token;
          },
        });
      } else if (++tries > 50) clearInterval(timer);
    }, 200);
    return () => {
      clearInterval(timer);
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey]);
  if (!siteKey) return null;
  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <div ref={box} />
      <input ref={input} type="hidden" name="turnstileToken" />
    </div>
  );
}
