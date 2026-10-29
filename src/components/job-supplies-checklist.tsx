"use client";

import { useState, useTransition } from "react";
import Image from "next/image";

import { toggleJobSupply } from "@/lib/actions/materials";
import { suggestSupplyIds } from "@/lib/job-supplies";
import { Button } from "@/components/ui/button";
import type { Material } from "@prisma/client";

export function JobSuppliesChecklist({
  jobId,
  materials,
  selectedIds,
  scope,
  canEdit,
}: {
  jobId: string;
  materials: Material[];
  selectedIds: string[];
  scope: string | null;
  canEdit: boolean;
}) {
  const [checked, setChecked] = useState(new Set(selectedIds));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(materialId: string, next: boolean) {
    const previous = new Set(checked);
    const updated = new Set(checked);
    if (next) updated.add(materialId);
    else updated.delete(materialId);
    setChecked(updated);
    setError(null);
    startTransition(async () => {
      try {
        await toggleJobSupply(jobId, materialId, next);
      } catch (err) {
        setChecked(previous);
        setError(err instanceof Error ? err.message : "Could not update");
      }
    });
  }

  function handleSuggest() {
    const suggested = suggestSupplyIds(materials, scope);
    for (const id of suggested) {
      if (!checked.has(id)) handleToggle(id, true);
    }
  }

  if (materials.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No supplies in the catalog yet — add some on the Materials page.
      </p>
    );
  }

  if (!canEdit) {
    const selected = materials.filter((m) => checked.has(m.id));
    return selected.length === 0 ? (
      <p className="text-sm text-muted-foreground">Nothing marked yet.</p>
    ) : (
      <ul className="space-y-2">
        {selected.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-sm">
            {m.photoUrl ? (
              <a href={m.photoUrl} target="_blank" rel="noreferrer">
                <Image
                  src={m.photoUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-md border object-cover"
                />
              </a>
            ) : null}
            {m.name}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      {scope ? (
        <Button type="button" variant="outline" size="sm" onClick={handleSuggest}>
          Suggest from scope
        </Button>
      ) : null}
      <div className="space-y-2">
        {materials.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked.has(m.id)}
              disabled={isPending}
              onChange={(e) => handleToggle(m.id, e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            {m.photoUrl ? (
              <a href={m.photoUrl} target="_blank" rel="noreferrer">
                <Image
                  src={m.photoUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-md border object-cover"
                />
              </a>
            ) : null}
            {m.name}
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
