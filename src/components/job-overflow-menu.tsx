"use client";

import { useEffect, useRef, useState } from "react";

import { DeleteButton } from "@/components/delete-button";

export function JobOverflowMenu({
  action,
  jobTitle,
}: {
  action: () => Promise<void>;
  jobTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
      >
        ⋯
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-10 mt-1 rounded-md border bg-popover p-1.5 shadow-md">
          <DeleteButton
            action={action}
            label="Delete job"
            confirmMessage={`Delete "${jobTitle}"? This can't be undone.`}
          />
        </div>
      ) : null}
    </div>
  );
}
