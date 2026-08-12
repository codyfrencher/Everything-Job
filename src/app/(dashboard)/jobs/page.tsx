import Link from "next/link";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { Button } from "@/components/ui/button";
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
import type { JobStatus } from "@prisma/client";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; techId?: string }>;
}) {
  const user = await requireUser();
  const { status, techId } = await searchParams;

  const isTech = user.role === "TECH";
  const techs = isTech
    ? []
    : await db.user.findMany({
        where: { role: { in: ["TECH", "DISPATCHER", "ADMIN"] } },
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Tech</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
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
                        ? job.scheduledStart.toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.assignedTo?.name ?? "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
