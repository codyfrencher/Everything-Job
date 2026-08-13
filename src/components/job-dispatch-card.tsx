"use client";

import { useTransition } from "react";
import Link from "next/link";

import { assignJob } from "@/lib/actions/jobs";
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
