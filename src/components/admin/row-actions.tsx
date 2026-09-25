"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { deleteResourceAction, moveResourceAction } from "@/server/admin/resource-actions";
import { ConfirmButton } from "./confirm-button";

export function MoveButtons({ resource, id }: { resource: string; id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const move = (dir: "up" | "down") =>
    start(async () => {
      const fd = new FormData();
      fd.set("resource", resource);
      fd.set("id", id);
      fd.set("dir", dir);
      await moveResourceAction(fd);
      router.refresh();
    });
  return (
    <span className="inline-flex gap-0.5">
      <button type="button" disabled={pending} onClick={() => move("up")} className="rounded p-1 text-muted hover:bg-slate-100 hover:text-ink" aria-label="Move up">
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" disabled={pending} onClick={() => move("down")} className="rounded p-1 text-muted hover:bg-slate-100 hover:text-ink" aria-label="Move down">
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

export function DeleteRowButton({ resource, id, name, description }: { resource: string; id: string; name: string; description: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      action={async (fd) => {
        const res = await deleteResourceAction(fd);
        if (!res.error) router.refresh();
        return res;
      }}
      fields={{ resource, id }}
      label={<Trash2 className="h-4 w-4" />}
      className="rounded-lg p-1.5 text-danger hover:bg-red-50"
      title={`Delete “${name}”?`}
      description={description}
      confirmLabel="Delete"
    />
  );
}
