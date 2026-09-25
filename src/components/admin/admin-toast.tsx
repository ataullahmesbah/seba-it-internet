"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, Info, X } from "lucide-react";

const NOTICES: Record<string, { text: string; tone: "info" | "success" }> = {
    "already-signed-in": { text: "You are already signed in.", tone: "info" },
};

/** One-shot toast driven by ?notice=… ; the parameter is removed from the URL once shown. */
export function AdminToast() {
    const sp = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const key = sp.get("notice");
    // Keep the message after the URL is cleaned up.
    const [shown, setShown] = useState<string | null>(null);
    if (key && NOTICES[key] && shown !== key) setShown(key);

    useEffect(() => {
        if (!key) return;
        const next = new URLSearchParams(sp);
        next.delete("notice");
        router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    }, [key, sp, router, pathname]);

    useEffect(() => {
        if (!shown) return;
        const t = setTimeout(() => setShown(null), 4500);
        return () => clearTimeout(t);
    }, [shown]);

    const notice = shown ? NOTICES[shown] : undefined;
    if (!notice) return null;
    const Icon = notice.tone === "success" ? CircleCheck : Info;
    return (
        <div role="status" aria-live="polite" className="fixed top-20 right-4 z-[60] flex max-w-sm items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-2xl">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm font-medium text-ink">{notice.text}</p>
            <button type="button" onClick={() => setShown(null)} className="rounded p-0.5 text-muted hover:text-ink" aria-label="Dismiss">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}