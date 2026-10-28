"use client";

import { useActionState, useState } from "react";

import { updateMaterial } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calcTypeHelp } from "@/components/material-calc-type-help";
import type { MaterialCalcType } from "@prisma/client";

export function EditMaterialForm({
  materialId,
  name,
  unit,
  calcType,
  rate,
  unitCost,
  onCancel,
}: {
  materialId: string;
  name: string;
  unit: string;
  calcType: MaterialCalcType;
  rate: number;
  unitCost: number;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateMaterial.bind(null, materialId),
    undefined,
  );

  return (
    <form action={formAction} className="w-full max-w-lg space-y-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`name-${materialId}`}>Material name</Label>
          <Input id={`name-${materialId}`} name="name" defaultValue={name} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`unit-${materialId}`}>Unit</Label>
          <Input id={`unit-${materialId}`} name="unit" defaultValue={unit} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`unitCost-${materialId}`}>Cost per unit ($)</Label>
          <Input
            id={`unitCost-${materialId}`}
            name="unitCost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={unitCost}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`calcType-${materialId}`}>Scales by</Label>
          <Select name="calcType" defaultValue={calcType}>
            <SelectTrigger id={`calcType-${materialId}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PER_SQFT">Square footage</SelectItem>
              <SelectItem value="PER_ROOM">Room count</SelectItem>
              <SelectItem value="FLAT">Flat (every job)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`rate-${materialId}`}>Rate</Label>
          <Input
            id={`rate-${materialId}`}
            name="rate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={rate}
            required
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{calcTypeHelp}</p>

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
  unit: string;
  calcType: MaterialCalcType;
  rate: number;
  unitCost: number;
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
