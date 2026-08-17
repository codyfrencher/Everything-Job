"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";

import { assignTechToJob, unassignTechFromJob } from "@/lib/actions/jobs";
import { directionsUrl } from "@/lib/maps";
import { COMPANY_TIME_ZONE } from "@/lib/timezone";
import { JobStatusBadge } from "@/components/job-status-badge";
import { JobStatusSelect } from "@/components/job-status-select";
import { Badge } from "@/components/ui/badge";
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
  job: Job & { customer: { name: string }; assignments: { userId: string }[] };
  techs: User[];
  canAssign: boolean;
  canUpdateStatus: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [assignedIds, setAssignedIds] = useState(job.assignments.map((a) => a.userId));
  const [assignError, setAssignError] = useState<string | null>(null);
  const directions = directionsUrl(job);

  // The same job can render as more than one card at once (once per tech
  // column it's assigned to). When a mutation lands through one card,
  // revalidatePath refreshes every card's `job` prop — resync local state
  // to it rather than letting a sibling card go stale.
  const assignedIdsKey = job.assignments
    .map((a) => a.userId)
    .slice()
    .sort()
    .join(",");
  useEffect(() => {
    setAssignedIds(job.assignments.map((a) => a.userId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedIdsKey]);

  const assignedTechs = assignedIds
    .map((id) => techs.find((t) => t.id === id))
    .filter((t): t is User => !!t);
  const unassignedTechs = techs.filter((t) => !assignedIds.includes(t.id));

  function handleAdd(userId: string) {
    const previous = assignedIds;
    setAssignedIds([...assignedIds, userId]);
    setAssignError(null);
    startTransition(async () => {
      try {
        await assignTechToJob(job.id, userId);
      } catch (err) {
        setAssignedIds(previous);
        setAssignError(err instanceof Error ? err.message : "Could not assign tech");
      }
    });
  }

  function handleRemove(userId: string) {
    const previous = assignedIds;
    setAssignedIds(assignedIds.filter((id) => id !== userId));
    setAssignError(null);
    startTransition(async () => {
      try {
        await unassignTechFromJob(job.id, userId);
      } catch (err) {
        setAssignedIds(previous);
        setAssignError(err instanceof Error ? err.message : "Could not unassign tech");
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
            {formatInTimeZone(job.scheduledStart, COMPANY_TIME_ZONE, "h:mm a")}
            {job.scheduledEnd
              ? ` – ${formatInTimeZone(job.scheduledEnd, COMPANY_TIME_ZONE, "h:mm a")}`
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

        {canAssign ? (
          <div className="flex flex-wrap gap-1">
            {assignedTechs.length === 0 ? (
              <span className="text-xs font-medium text-amber-600">Unassigned</span>
            ) : null}
            {assignedTechs.map((tech) => (
              <Badge key={tech.id} variant="secondary" className="gap-1 pr-1">
                {tech.name}
                <button
                  type="button"
                  onClick={() => handleRemove(tech.id)}
                  aria-label={`Remove ${tech.name}`}
                  className="ml-0.5 rounded-full px-1 hover:bg-muted-foreground/20"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        ) : null}

        {canAssign || canUpdateStatus ? (
          <div className="flex gap-2 pt-1">
            {canAssign ? (
              <div className="flex-1">
                <Select
                  value=""
                  onValueChange={handleAdd}
                  disabled={unassignedTechs.length === 0}
                >
                  <SelectTrigger size="sm" className="w-full text-xs">
                    <SelectValue placeholder="+ Add tech" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedTechs.map((tech) => (
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
                hideCancel={!canAssign}
              />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
