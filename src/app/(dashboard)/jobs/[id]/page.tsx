import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { updateJob, deleteJob } from "@/lib/actions/jobs";
import { directionsUrl } from "@/lib/maps";
import { JobForm } from "@/components/job-form";
import { JobPhotos } from "@/components/job-photos";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        role: "TECH",
        OR: [{ deactivatedAt: null }, { id: { in: assignedUserIds } }],
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const updateJobWithId = updateJob.bind(null, job.id);
  const deleteJobWithId = deleteJob.bind(null, job.id);
  const directions = directionsUrl(job);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <div className="flex gap-2">
          {directions && (
            <Button asChild variant="outline" size="sm">
              <a href={directions} target="_blank" rel="noreferrer">
                Get directions
              </a>
            </Button>
          )}
          {canManage && (
            <DeleteButton
              action={deleteJobWithId}
              label="Delete job"
              confirmMessage="Delete this job? This can't be undone."
            />
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
        </CardHeader>
        <CardContent>
          <JobForm
            job={job}
            customers={customers}
            techs={techs}
            action={updateJobWithId}
            submitLabel="Save changes"
            readOnly={user.role === "TECH"}
          />
        </CardContent>
      </Card>

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
