"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { assignJob } from "@/lib/actions/jobs";
import { directionsUrl } from "@/lib/maps";
import { JobStatusBadge } from "@/components/job-status-badge";
import { JobStatusSelect } from "@/components/job-status-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { Job, User } from "@prisma/client";

export function JobDispatchCard({
  job,
  techs,
  canAssign,
  canUpdateStatus,
}: {
  job: Job & { customer: { name: string } };
  techs: User[];
  canAssign: boolean;
  canUpdateStatus: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [assignedToId, setAssignedToId] = useState(job.assignedToId ?? "unassigned");
  const [assignError, setAssignError] = useState<string | null>(null);
  const directions = directionsUrl(job);

  function handleAssignChange(value: string) {
    const previous = assignedToId;
    setAssignedToId(value);
    setAssignError(null);
    startTransition(async () => {
      try {
        await assignJob(job.id, value === "unassigned" ? null : value);
      } catch (err) {
        setAssignedToId(previous);
        setAssignError(err instanceof Error ? err.message : "Could not assign job");
      }
    });
  }

  return (
    <Card className={isPending ? "opacity-60" : undefined}>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
            {job.title}
          </Link>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="text-sm text-muted-foreground">{job.customer.name}</p>
        {job.scheduledStart ? (
          <p className="text-xs text-muted-foreground">
            {job.scheduledStart.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            {job.scheduledEnd
              ? ` – ${job.scheduledEnd.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : ""}
          </p>
        ) : null}
        {directions ? (
          <a
            href={directions}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-muted-foreground underline hover:text-foreground"
          >
            Get directions
          </a>
        ) : null}

        {canAssign || canUpdateStatus ? (
          <div className="flex gap-2 pt-1">
            {canAssign ? (
              <div className="flex-1">
                <Select value={assignedToId} onValueChange={handleAssignChange}>
                  <SelectTrigger size="sm" className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {techs.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignError ? (
                  <p className="mt-1 text-xs text-destructive">{assignError}</p>
                ) : null}
              </div>
            ) : null}

            {canUpdateStatus ? (
              <JobStatusSelect
                jobId={job.id}
                status={job.status}
                className="flex-1"
              />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
