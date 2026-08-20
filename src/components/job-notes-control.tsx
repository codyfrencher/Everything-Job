"use client";

import { useState, useTransition } from "react";

import { updateJobNotes } from "@/lib/actions/jobs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function JobNotesControl({ jobId, notes }: { jobId: string; notes: string | null }) {
  const [value, setValue] = useState(notes ?? "");
  const [saved, setSaved] = useState(notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty = value !== saved;

  function handleSave() {
    setError(null);
    setJustSaved(false);
    startTransition(async () => {
      try {
        await updateJobNotes(jobId, value);
        setSaved(value);
        setJustSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save notes");
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
        placeholder="Add a note for the job..."
        className="border-amber-300 bg-amber-50/60 focus-visible:ring-amber-400 dark:border-amber-900 dark:bg-amber-950/20"
      />
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || isPending}>
          {isPending ? "Saving..." : "Save note"}
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
