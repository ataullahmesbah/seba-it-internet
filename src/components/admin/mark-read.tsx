"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function MarkReadButton({ ids, all, label }: { ids?: string[]; all?: boolean; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-outline !min-h-9 text-xs"
      onClick={() =>
        start(async () => {
          await fetch("/api/v1/admin/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(all ? { all: true } : { ids }) });
          router.refresh();
        })
      }
    >
      {label}
    </button>
  );
}
