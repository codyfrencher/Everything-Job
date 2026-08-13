import Link from "next/link";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { JobDispatchCard } from "@/components/job-dispatch-card";
import { Button } from "@/components/ui/button";
import { COMPANY_TIME_ZONE } from "@/lib/timezone";

function parseDateParam(value: string | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return formatInTimeZone(new Date(), COMPANY_TIME_ZONE, "yyyy-MM-dd");
}

function shiftDateParam(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

  const dateStr = parseDateParam(dateParam);
  const dayStart = fromZonedTime(`${dateStr}T00:00:00`, COMPANY_TIME_ZONE);
  const dayEnd = fromZonedTime(`${dateStr}T23:59:59.999`, COMPANY_TIME_ZONE);

  const prevDateStr = shiftDateParam(dateStr, -1);
  const nextDateStr = shiftDateParam(dateStr, 1);

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
  const needsTech = jobs.filter((j) => j.scheduledStart && !j.assignedToId);
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
            <Link href={`/schedule?date=${prevDateStr}`}>← Previous day</Link>
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">
            {formatInTimeZone(dayStart, COMPANY_TIME_ZONE, "EEEE, MMM d")}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/schedule?date=${nextDateStr}`}>Next day →</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
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

        {!isTech && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Needs a tech
            </h2>
            <div className="space-y-2">
              {needsTech.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing waiting on a tech.</p>
              ) : (
                needsTech.map((job) => (
                  <JobDispatchCard
                    key={job.id}
                    job={job}
                    techs={techs}
                    canAssign={canManage}
                    canUpdateStatus={canManage}
                  />
                ))
              )}
            </div>
          </div>
        )}

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
