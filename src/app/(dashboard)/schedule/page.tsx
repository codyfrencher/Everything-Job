import Link from "next/link";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { JobDispatchCard } from "@/components/job-dispatch-card";
import { Button } from "@/components/ui/button";
import { COMPANY_TIME_ZONE } from "@/lib/timezone";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

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

function weekdayIndex(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function startOfWeek(dateStr: string) {
  return shiftDateParam(dateStr, -weekdayIndex(dateStr));
}

function startOfMonth(dateStr: string) {
  const [y, m] = dateStr.split("-").map(Number);
  return `${y}-${pad(m)}-01`;
}

function shiftMonthParam(dateStr: string, months: number) {
  const [y, m] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-01`;
}

function daysInMonth(dateStr: string) {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function zonedStartOfDay(dateStr: string) {
  return fromZonedTime(`${dateStr}T00:00:00`, COMPANY_TIME_ZONE);
}

function zonedEndOfDay(dateStr: string) {
  return fromZonedTime(`${dateStr}T23:59:59.999`, COMPANY_TIME_ZONE);
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const user = await requireUser();
  const { date: dateParam, view: viewParam } = await searchParams;
  const isTech = user.role === "TECH";
  const canManage = user.role === "ADMIN" || user.role === "DISPATCHER";
  const view: "week" | "month" = viewParam === "month" ? "month" : "week";

  const anchor = parseDateParam(dateParam);
  const dateQuery = (d: string) => `&date=${d}`;

  let weekDays: string[] = [];
  let monthWeeks: string[][] = [];
  let rangeStartStr: string;
  let rangeEndStr: string;
  let rangeLabel: string;
  let prevHref: string;
  let nextHref: string;
  const todayHref = `/schedule?view=${view}`;
  const monthStart = startOfMonth(anchor);

  if (view === "week") {
    const weekStart = startOfWeek(anchor);
    weekDays = Array.from({ length: 7 }, (_, i) => shiftDateParam(weekStart, i));
    rangeStartStr = weekDays[0];
    rangeEndStr = weekDays[6];
    const startLabel = formatInTimeZone(zonedStartOfDay(rangeStartStr), COMPANY_TIME_ZONE, "MMM d");
    const endLabel = formatInTimeZone(zonedStartOfDay(rangeEndStr), COMPANY_TIME_ZONE, "MMM d, yyyy");
    rangeLabel = `${startLabel} – ${endLabel}`;
    prevHref = `/schedule?view=week${dateQuery(shiftDateParam(weekStart, -7))}`;
    nextHref = `/schedule?view=week${dateQuery(shiftDateParam(weekStart, 7))}`;
  } else {
    const monthEnd = `${monthStart.slice(0, 8)}${pad(daysInMonth(monthStart))}`;
    const gridStart = startOfWeek(monthStart);
    const gridEnd = shiftDateParam(startOfWeek(monthEnd), 6);
    rangeStartStr = gridStart;
    rangeEndStr = gridEnd;
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      monthWeeks.push(Array.from({ length: 7 }, (_, i) => shiftDateParam(cursor, i)));
      cursor = shiftDateParam(cursor, 7);
    }
    rangeLabel = formatInTimeZone(zonedStartOfDay(monthStart), COMPANY_TIME_ZONE, "MMMM yyyy");
    prevHref = `/schedule?view=month${dateQuery(shiftMonthParam(monthStart, -1))}`;
    nextHref = `/schedule?view=month${dateQuery(shiftMonthParam(monthStart, 1))}`;
  }

  const rangeStart = zonedStartOfDay(rangeStartStr);
  const rangeEnd = zonedEndOfDay(rangeEndStr);

  const techs = await db.user.findMany({
    where: { role: "TECH", ...(isTech ? { id: user.id } : {}) },
    orderBy: { name: "asc" },
  });

  const jobs = await db.job.findMany({
    where: {
      ...(isTech ? { assignments: { some: { userId: user.id } } } : {}),
      OR: [
        { scheduledStart: { gte: rangeStart, lte: rangeEnd } },
        { scheduledStart: null },
      ],
    },
    include: {
      customer: { select: { name: true } },
      assignments: { select: { userId: true } },
    },
    orderBy: { scheduledStart: "asc" },
  });

  const unscheduled = jobs.filter((j) => !j.scheduledStart);
  const scheduled = jobs.filter((j) => j.scheduledStart);

  function jobsForDay(dateStr: string) {
    return scheduled.filter(
      (j) => formatInTimeZone(j.scheduledStart!, COMPANY_TIME_ZONE, "yyyy-MM-dd") === dateStr,
    );
  }

  function renderCard(job: (typeof jobs)[number]) {
    return (
      <div key={job.id} className="w-full max-w-xs">
        <JobDispatchCard
          job={job}
          techs={techs}
          canAssign={canManage}
          canUpdateStatus={canManage || job.assignments.some((a) => a.userId === user.id)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <div className="flex items-center gap-1 rounded-lg border border-input p-1">
          <Link
            href={`/schedule?view=week${dateParam ? dateQuery(dateParam) : ""}`}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              view === "week"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Week
          </Link>
          <Link
            href={`/schedule?view=month${dateParam ? dateQuery(dateParam) : ""}`}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              view === "month"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Month
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-lg font-medium">{rangeLabel}</span>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={prevHref}>← Previous {view === "week" ? "week" : "month"}</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={todayHref}>Today</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={nextHref}>Next {view === "week" ? "week" : "month"} →</Link>
          </Button>
        </div>
      </div>

      {unscheduled.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Unscheduled</h2>
          <div className="flex flex-wrap gap-3">{unscheduled.map(renderCard)}</div>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[1540px] grid-cols-7 gap-px rounded-lg border border-border bg-border text-sm">
            {weekDays.map((day) => (
              <div
                key={`h-${day}`}
                className="bg-muted px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground"
              >
                {formatInTimeZone(zonedStartOfDay(day), COMPANY_TIME_ZONE, "EEE, MMM d")}
              </div>
            ))}
            {weekDays.map((day) => {
              const dayJobs = jobsForDay(day);
              return (
                <div key={day} className="min-h-32 space-y-2 bg-background p-2">
                  {dayJobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No jobs scheduled.</p>
                  ) : (
                    dayJobs.map(renderCard)
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 gap-px rounded-lg border border-border bg-border text-sm">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="bg-muted px-2 py-1 text-center text-xs font-semibold text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {monthWeeks.flatMap((week) =>
              week.map((day) => {
                const dayJobs = jobsForDay(day);
                const inMonth = day.slice(0, 7) === monthStart.slice(0, 7);
                return (
                  <div
                    key={day}
                    className={cn(
                      "min-h-28 space-y-1 bg-background p-1.5",
                      !inMonth && "bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs",
                        inMonth ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {Number(day.slice(8, 10))}
                    </span>
                    <div className="space-y-1">
                      {dayJobs.map((job) => (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}`}
                          title={job.title}
                          className="block truncate rounded bg-muted px-1 py-0.5 text-xs hover:bg-muted/70"
                        >
                          {formatInTimeZone(job.scheduledStart!, COMPANY_TIME_ZONE, "h:mmaaa")} {job.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
