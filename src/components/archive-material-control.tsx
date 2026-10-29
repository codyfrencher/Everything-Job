"use client";

import { useState, useTransition } from "react";

import { archiveMaterial, restoreMaterial } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";

export function ArchiveMaterialControl({
  materialId,
  isArchived,
}: {
  materialId: string;
  isArchived: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isArchived) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await restoreMaterial(materialId);
            } catch {
              setError("Couldn't restore. Try again.");
            }
          });
        }}
      >
        {isPending ? "Restoring..." : "Restore"}
      </Button>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (
            !window.confirm(
              "Archive this material? It'll stop showing up in materials estimates until restored.",
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            try {
              await archiveMaterial(materialId);
            } catch {
              setError("Couldn't archive. Try again.");
            }
          });
        }}
      >
        {isPending ? "Archiving..." : "Archive"}
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
