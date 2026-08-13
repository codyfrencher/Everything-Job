"use client";

import { useState, useTransition } from "react";

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
}: {
  jobId: string;
  status: JobStatus;
  className?: string;
}) {
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
          {Object.entries(statusLabels).map(([v, label]) => (
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
