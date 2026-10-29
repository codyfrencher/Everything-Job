"use client";

import { useActionState, useState } from "react";

import { updateMaterial } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditMaterialForm({
  materialId,
  name,
  keywords,
  onCancel,
}: {
  materialId: string;
  name: string;
  keywords: string | null;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateMaterial.bind(null, materialId),
    undefined,
  );

  return (
    <form action={formAction} className="w-full max-w-lg space-y-3 rounded-lg border p-3">
      <div className="space-y-1">
        <Label htmlFor={`name-${materialId}`}>Supply name</Label>
        <Input id={`name-${materialId}`} name="name" defaultValue={name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`keywords-${materialId}`}>Suggest when scope mentions (optional)</Label>
        <Input
          id={`keywords-${materialId}`}
          name="keywords"
          defaultValue={keywords ?? ""}
          placeholder="e.g. ceiling, vaulted, high ceiling"
        />
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Close
        </Button>
      </div>
    </form>
  );
}

export function EditMaterialControl(props: {
  materialId: string;
  name: string;
  keywords: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
    );
  }

  return <EditMaterialForm {...props} onCancel={() => setOpen(false)} />;
}
