import Link from "next/link";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JobStatusBadge } from "@/components/job-status-badge";
import type { JobStatus } from "@prisma/client";

const STATUS_ORDER: JobStatus[] = [
  "UNSCHEDULED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const isTech = user.role === "TECH";

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [statusCounts, todaysJobs] = await Promise.all([
    db.job.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: isTech ? { assignedToId: user.id } : undefined,
    }),
    db.job.findMany({
      where: {
        ...(isTech ? { assignedToId: user.id } : {}),
        OR: [
          {
            scheduledStart: { gte: startOfDay, lte: endOfDay },
          },
          { status: "UNSCHEDULED" },
        ],
      },
      include: { customer: true, assignedTo: true },
      orderBy: { scheduledStart: "asc" },
      take: 10,
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((c) => [c.status, c._count._all]),
  ) as Partial<Record<JobStatus, number>>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">
          {isTech
            ? "Here's what's on your plate today."
            : "Here's what's happening across the team today."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STATUS_ORDER.map((status) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <JobStatusBadge status={status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">
                {countByStatus[status] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today &amp; unscheduled</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing scheduled today. Head to{" "}
              <Link href="/jobs/new" className="underline">
                new job
              </Link>{" "}
              to add one.
            </p>
          ) : (
            <ul className="divide-y">
              {todaysJobs.map((job) => (
                <li key={job.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="font-medium hover:underline"
                    >
                      {job.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {job.customer.name}
                      {job.assignedTo ? ` · ${job.assignedTo.name}` : " · Unassigned"}
                      {job.scheduledStart
                        ? ` · ${job.scheduledStart.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
