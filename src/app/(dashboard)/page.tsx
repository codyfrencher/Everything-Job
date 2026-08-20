import Link from "next/link";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

import { requireUser } from "@/lib/require-user";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JobStatusBadge } from "@/components/job-status-badge";
import { JobStatusSelect } from "@/components/job-status-select";
import { COMPANY_TIME_ZONE } from "@/lib/timezone";
import type { JobStatus } from "@prisma/client";

const STATUS_ORDER: JobStatus[] = [
  "UNSCHEDULED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export default async function DashboardPage() {
  const user = await requireUser();
  const isTech = user.role === "TECH";
  const canUpdateStatus = (job: { assignments: { userId: string }[] }) =>
    !isTech || job.assignments.some((a) => a.userId === user.id);

  const todayStr = formatInTimeZone(new Date(), COMPANY_TIME_ZONE, "yyyy-MM-dd");
  const startOfDay = fromZonedTime(`${todayStr}T00:00:00`, COMPANY_TIME_ZONE);
  const endOfDay = fromZonedTime(`${todayStr}T23:59:59.999`, COMPANY_TIME_ZONE);

  const [statusCounts, todaysJobs] = await Promise.all([
    db.job.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: isTech ? { assignments: { some: { userId: user.id } } } : undefined,
    }),
    db.job.findMany({
      where: isTech
        ? {
            assignments: { some: { userId: user.id } },
            scheduledStart: { gte: startOfDay, lte: endOfDay },
            status: { notIn: ["CANCELLED", "COMPLETED"] },
          }
        : {
            OR: [
              { scheduledStart: { gte: startOfDay, lte: endOfDay } },
              { status: "UNSCHEDULED" },
            ],
          },
      include: { customer: true, assignments: { include: { user: true } } },
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
          <Link key={status} href={`/jobs?status=${status}`}>
            <Card className="transition-colors hover:border-foreground/30">
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
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isTech ? "Today's jobs" : "Today & unscheduled"}</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isTech
                ? "Nothing on your schedule today."
                : (
                  <>
                    Nothing scheduled today. Head to{" "}
                    <Link href="/jobs/new" className="underline">
                      new job
                    </Link>{" "}
                    to add one.
                  </>
                )}
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
                      {job.assignments.length > 0
                        ? ` · ${job.assignments.map((a) => a.user.name).join(", ")}`
                        : " · Unassigned"}
                      {job.scheduledStart
                        ? ` · ${formatInTimeZone(
                            job.scheduledStart,
                            COMPANY_TIME_ZONE,
                            "h:mm a",
                          )}`
                        : ""}
                    </p>
                  </div>
                  {canUpdateStatus(job) ? (
                    <JobStatusSelect jobId={job.id} status={job.status} hideCancel={isTech} />
                  ) : (
                    <JobStatusBadge status={job.status} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
