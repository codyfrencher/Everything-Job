"use client";

import { useEffect, useState, useTransition } from "react";

import { updateJobStatus } from "@/lib/actions/jobs";
import { statusLabels } from "@/components/job-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";

export function JobStatusSelect({
  jobId,
  status,
  className,
  hideCancel = false,
}: {
  jobId: string;
  status: JobStatus;
  className?: string;
  /** Cancelling is a dispatch-level call — Techs shouldn't be offered it,
   * unless the job is already cancelled (so the select still has a valid
   * value to display). */
  hideCancel?: boolean;
}) {
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The same job can render in more than one place at once (e.g. every
  // tech column it's assigned to on the dispatch board), each as its own
  // component instance with independent local state. When a mutation
  // lands through one instance, revalidatePath refreshes this instance's
  // `status` prop too — resync local state to it rather than letting a
  // sibling instance go stale.
  useEffect(() => {
    setValue(status);
  }, [status]);

  function handleChange(next: JobStatus) {
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      try {
        await updateJobStatus(jobId, next);
      } catch (err) {
        setValue(previous);
        setError(err instanceof Error ? err.message : "Could not update status");
      }
    });
  }

  return (
    <div className={className}>
      <Select
        value={value}
        onValueChange={(next) => handleChange(next as JobStatus)}
      >
        <SelectTrigger
          size="sm"
          className={cn("w-full text-xs", isPending && "opacity-60")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusLabels)
            .filter(([v]) => v !== "CANCELLED" || !hideCancel || value === "CANCELLED")
            .map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
