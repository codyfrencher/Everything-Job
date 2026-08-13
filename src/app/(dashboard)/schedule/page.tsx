import Link from "next/link";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { JobDispatchCard } from "@/components/job-dispatch-card";
import { Button } from "@/components/ui/button";

function parseDate(value: string | undefined) {
  if (!value) return new Date();
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function toDateParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const { date: dateParam } = await searchParams;
  const isTech = user.role === "TECH";
  const canManage = user.role === "ADMIN" || user.role === "DISPATCHER";

  const date = parseDate(dateParam);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  const techs = await db.user.findMany({
    where: { role: "TECH", ...(isTech ? { id: user.id } : {}) },
    orderBy: { name: "asc" },
  });

  const jobs = await db.job.findMany({
    where: {
      ...(isTech ? { assignedToId: user.id } : {}),
      OR: [
        { scheduledStart: { gte: dayStart, lte: dayEnd } },
        { scheduledStart: null },
      ],
    },
    include: { customer: { select: { name: true } } },
    orderBy: { scheduledStart: "asc" },
  });

  const unscheduled = jobs.filter((j) => !j.scheduledStart);
  const jobsByTech = new Map<string, typeof jobs>();
  for (const tech of techs) {
    jobsByTech.set(
      tech.id,
      jobs.filter((j) => j.scheduledStart && j.assignedToId === tech.id),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/schedule?date=${toDateParam(prevDate)}`}>
              ← Previous day
            </Link>
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">
            {date.toLocaleDateString([], {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/schedule?date=${toDateParam(nextDate)}`}>
              Next day →
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Unscheduled
          </h2>
          <div className="space-y-2">
            {unscheduled.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing unscheduled.</p>
            ) : (
              unscheduled.map((job) => (
                <JobDispatchCard
                  key={job.id}
                  job={job}
                  techs={techs}
                  canAssign={canManage}
                  canUpdateStatus={canManage || job.assignedToId === user.id}
                />
              ))
            )}
          </div>
        </div>

        {techs.map((tech) => (
          <div key={tech.id} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {tech.name}
            </h2>
            <div className="space-y-2">
              {(jobsByTech.get(tech.id) ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No jobs scheduled.</p>
              ) : (
                jobsByTech.get(tech.id)!.map((job) => (
                  <JobDispatchCard
                    key={job.id}
                    job={job}
                    techs={techs}
                    canAssign={canManage}
                    canUpdateStatus={canManage || job.assignedToId === user.id}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
