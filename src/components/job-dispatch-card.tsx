"use client";

import { useTransition } from "react";
import Link from "next/link";

import { assignJob, updateJobStatus } from "@/lib/actions/jobs";
import { JobStatusBadge, statusLabels } from "@/components/job-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { Job, JobStatus, User } from "@prisma/client";

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

        {canAssign || canUpdateStatus ? (
          <div className="flex gap-2 pt-1">
            {canAssign ? (
              <Select
                defaultValue={job.assignedToId ?? "unassigned"}
                onValueChange={(value) =>
                  startTransition(() => {
                    assignJob(job.id, value === "unassigned" ? null : value);
                  })
                }
              >
                <SelectTrigger size="sm" className="flex-1 text-xs">
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
            ) : null}

            {canUpdateStatus ? (
              <Select
                defaultValue={job.status}
                onValueChange={(value) =>
                  startTransition(() => {
                    updateJobStatus(job.id, value as JobStatus);
                  })
                }
              >
                <SelectTrigger size="sm" className="flex-1 text-xs">
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
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
