"use client";

import { useTransition } from "react";

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
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={status}
      onValueChange={(value) =>
        startTransition(() => {
          updateJobStatus(jobId, value as JobStatus);
        })
      }
    >
      <SelectTrigger
        size="sm"
        className={cn("text-xs", isPending && "opacity-60", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusLabels).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
