import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { updateJob, deleteJob } from "@/lib/actions/jobs";
import { JobForm } from "@/components/job-form";
import { DeleteButton } from "@/components/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const job = await db.job.findUnique({ where: { id } });
  if (!job) notFound();
  if (user.role === "TECH" && job.assignedToId !== user.id) notFound();

  const canManage = user.role === "ADMIN" || user.role === "DISPATCHER";

  const [customers, techs] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { role: { in: ["TECH", "DISPATCHER", "ADMIN"] } },
      orderBy: { name: "asc" },
    }),
  ]);

  const updateJobWithId = updateJob.bind(null, job.id);
  const deleteJobWithId = deleteJob.bind(null, job.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        {canManage && (
          <DeleteButton
            action={deleteJobWithId}
            label="Delete job"
            confirmMessage="Delete this job? This can't be undone."
          />
        )}
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
