import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { deleteJob } from "@/lib/actions/jobs";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { JobStatusBadge, statusLabels } from "@/components/job-status-badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COMPANY_TIME_ZONE } from "@/lib/timezone";
import type { JobStatus } from "@prisma/client";

function formatSchedule(date: Date) {
  return formatInTimeZone(date, COMPANY_TIME_ZONE, "MMM d, h:mm a");
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; techId?: string }>;
}) {
  const user = await requireUser();
  const { status, techId } = await searchParams;

  const isTech = user.role === "TECH";
  const canManage = user.role === "ADMIN" || user.role === "DISPATCHER";
  const techs = isTech
    ? []
    : await db.user.findMany({
        where: { role: "TECH" },
        orderBy: { name: "asc" },
      });

  const jobs = await db.job.findMany({
    where: {
      ...(isTech ? { assignedToId: user.id } : {}),
      ...(status ? { status: status as JobStatus } : {}),
      ...(!isTech && techId ? { assignedToId: techId } : {}),
    },
    include: { customer: true, assignedTo: true },
    orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        {!isTech && (
          <Button asChild>
            <Link href="/jobs/new">New job</Link>
          </Button>
        )}
      </div>

      <form className="flex flex-wrap gap-2">
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {!isTech && (
          <select
            name="techId"
            defaultValue={techId ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Everyone</option>
            {techs.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="text-center text-muted-foreground">
            No jobs found.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium hover:underline"
                    >
                      {job.title}
                    </Link>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{job.customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.scheduledStart
                      ? formatSchedule(job.scheduledStart)
                      : "Not scheduled"}
                    {" · "}
                    {job.assignedTo?.name ?? "Unassigned"}
                  </p>
                  {canManage && (
                    <div className="flex gap-2 pt-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/jobs/${job.id}`}>Edit</Link>
                      </Button>
                      <DeleteButton
                        action={deleteJob.bind(null, job.id)}
                        label="Delete"
                        confirmMessage={`Delete "${job.title}"? This can't be undone.`}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Tech</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                          {job.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {job.customer.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {job.scheduledStart
                          ? formatSchedule(job.scheduledStart)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {job.assignedTo?.name ?? "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <JobStatusBadge status={job.status} />
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/jobs/${job.id}`}>Edit</Link>
                            </Button>
                            <DeleteButton
                              action={deleteJob.bind(null, job.id)}
                              label="Delete"
                              confirmMessage={`Delete "${job.title}"? This can't be undone.`}
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
