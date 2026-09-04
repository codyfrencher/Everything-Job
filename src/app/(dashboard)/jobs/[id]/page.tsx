import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { deleteJob } from "@/lib/actions/jobs";
import { directionsUrl } from "@/lib/maps";
import { COMPANY_TIME_ZONE } from "@/lib/timezone";
import { JobStatusPills } from "@/components/job-status-pills";
import { JobInfoPanel } from "@/components/job-info-panel";
import { JobScopeControl } from "@/components/job-scope-control";
import { JobNotesControl } from "@/components/job-notes-control";
import { JobOverflowMenu } from "@/components/job-overflow-menu";
import { JobPhotos } from "@/components/job-photos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatSchedule(start: Date | null, end: Date | null): string | null {
  if (!start) return null;
  const startLabel = formatInTimeZone(start, COMPANY_TIME_ZONE, "EEE, MMM d 'at' h:mm a");
  if (!end) return startLabel;
  return `${startLabel} – ${formatInTimeZone(end, COMPANY_TIME_ZONE, "h:mm a")}`;
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const job = await db.job.findUnique({
    where: { id },
    include: {
      customer: true,
      photos: { orderBy: { createdAt: "desc" } },
      assignments: { select: { userId: true } },
    },
  });
  if (!job) notFound();
  const assignedUserIds = job.assignments.map((a) => a.userId);
  if (user.role === "TECH" && !assignedUserIds.includes(user.id)) notFound();

  const canManage = user.role === "ADMIN" || user.role === "DISPATCHER";

  const [customers, techs] = await Promise.all([
    db.customer.findMany({
      where: { OR: [{ archivedAt: null }, { id: job.customerId }] },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      // Include a deactivated tech only if they're already assigned to
      // this job, so an existing assignment doesn't silently disappear
      // (and get dropped on save) just because the form no longer lists
      // them as an assignable option.
      where: {
        role: { in: ["TECH", "ADMIN"] },
        OR: [{ deactivatedAt: null }, { id: { in: assignedUserIds } }],
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const deleteJobWithId = deleteJob.bind(null, job.id);
  const directions = directionsUrl(job);
  const scheduleLabel = formatSchedule(job.scheduledStart, job.scheduledEnd);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        {canManage ? <JobOverflowMenu action={deleteJobWithId} jobTitle={job.title} /> : null}
      </div>

      <JobStatusPills jobId={job.id} status={job.status} hideCancel={!canManage} />

      {directions || job.customer.phone ? (
        <div className="flex gap-2">
          {directions ? (
            <Button asChild variant="outline" className="flex-1">
              <a href={directions} target="_blank" rel="noreferrer">
                🧭 Directions
              </a>
            </Button>
          ) : null}
          {job.customer.phone ? (
            <Button asChild variant="outline" className="flex-1">
              <a href={`tel:${job.customer.phone}`}>📞 Call customer</a>
            </Button>
          ) : null}
        </div>
      ) : null}

      <JobInfoPanel
        job={job}
        customers={customers}
        techs={techs}
        assignedUserIds={assignedUserIds}
        scheduleLabel={scheduleLabel}
        canEdit={canManage}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Scope of work
        </p>
        <JobScopeControl jobId={job.id} description={job.description} canEdit={canManage} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Notes
        </p>
        <JobNotesControl jobId={job.id} notes={job.notes} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <JobPhotos
            jobId={job.id}
            photos={job.photos}
            canDelete={canManage || assignedUserIds.includes(user.id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
