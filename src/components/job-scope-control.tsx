"use client";

import { useState, useTransition } from "react";

import { updateJobScope } from "@/lib/actions/jobs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function JobScopeControl({
  jobId,
  description,
  canEdit,
}: {
  jobId: string;
  description: string | null;
  canEdit: boolean;
}) {
  const [value, setValue] = useState(description ?? "");
  const [saved, setSaved] = useState(description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <div className="min-h-[64px] rounded-lg border bg-muted/40 p-3 text-sm text-foreground">
        {description ? description : <span className="text-muted-foreground">Nothing set yet.</span>}
      </div>
    );
  }

  const dirty = value !== saved;

  function handleSave() {
    setError(null);
    setJustSaved(false);
    startTransition(async () => {
      try {
        await updateJobScope(jobId, value);
        setSaved(value);
        setJustSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save scope of work");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setJustSaved(false);
        }}
        placeholder="What does the tech need to do on this job?"
        className="border-amber-300 bg-amber-50/60 focus-visible:ring-amber-400 dark:border-amber-900 dark:bg-amber-950/20"
      />
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : justSaved ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>
        ) : null}
      </div>
    </div>
  );
}
