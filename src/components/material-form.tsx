"use client";

import { useActionState, useRef, useEffect } from "react";

import { createMaterial } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="space-y-2">
        <Label htmlFor="name">Supply name</Label>
        <Input id="name" name="name" placeholder="e.g. 6 mil plastic sheeting" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="keywords">Suggest when scope mentions (optional)</Label>
        <Input id="keywords" name="keywords" placeholder="e.g. ceiling, vaulted, high ceiling" />
        <p className="text-xs text-muted-foreground">
          Comma-separated words. If any appear in a job&apos;s Scope of Work, this
          gets pre-checked on that job&apos;s supply list — still fully optional to
          toggle either way.
        </p>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add supply"}
      </Button>
    </form>
  );
}
