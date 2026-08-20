"use client";

import { useState, useTransition } from "react";

import { updateJobStatus } from "@/lib/actions/jobs";
import { statusLabels } from "@/components/job-status-badge";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";

const pillStyles: Record<JobStatus, string> = {
  UNSCHEDULED: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function JobStatusPills({
  jobId,
  status,
  hideCancel = false,
}: {
  jobId: string;
  status: JobStatus;
  /** Cancelling is a dispatch-level call — Techs shouldn't be offered it,
   * unless the job is already cancelled (so its own pill still shows). */
  hideCancel?: boolean;
}) {
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // The same job can render in more than one place at once. When a
  // mutation lands elsewhere, revalidatePath refreshes this instance's
  // `status` prop too — resync local state to it during render rather
  // than in an effect, so a sibling instance can't go stale for a frame.
  const [prevStatus, setPrevStatus] = useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    setValue(status);
  }

  function handleChange(next: JobStatus) {
    if (next === value) return;
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

  const options = Object.entries(statusLabels).filter(
    ([v]) => v !== "CANCELLED" || !hideCancel || value === "CANCELLED",
  ) as [JobStatus, string][];

  return (
    <div>
      <div className={cn("flex gap-1.5 overflow-x-auto pb-1", isPending && "opacity-60")}>
        {options.map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => handleChange(v)}
            disabled={isPending}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
              v === value
                ? cn("border-transparent", pillStyles[v])
                : "border-input bg-background text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
