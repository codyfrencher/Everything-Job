"use client";

import { useActionState, useRef, useEffect } from "react";

import { createMaterial } from "@/lib/actions/materials";
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

export function MaterialForm() {
  const [state, formAction, pending] = useActionState(createMaterial, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error) {
      formRef.current?.reset();
    }
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Material name</Label>
          <Input id="name" name="name" placeholder="e.g. 6 mil plastic sheeting" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" name="unit" placeholder="e.g. roll, case, gallon" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitCost">Cost per unit ($)</Label>
          <Input
            id="unitCost"
            name="unitCost"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="calcType">Scales by</Label>
          <Select name="calcType" defaultValue="PER_SQFT">
            <SelectTrigger id="calcType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PER_SQFT">Square footage</SelectItem>
              <SelectItem value="PER_ROOM">Room count</SelectItem>
              <SelectItem value="FLAT">Flat (every job)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate">Rate</Label>
          <Input id="rate" name="rate" type="number" step="0.01" min="0" required />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{calcTypeHelp}</p>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add material"}
      </Button>
    </form>
  );
}
