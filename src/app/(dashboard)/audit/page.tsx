import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/require-user";
import { statusLabels } from "@/components/job-status-badge";
import { COMPANY_TIME_ZONE } from "@/lib/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JobStatus } from "@prisma/client";

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  edited: "Edited",
  status_changed: "Status changed",
  assigned: "Assigned",
  reassigned: "Reassigned",
  unassigned: "Unassigned",
  deleted: "Deleted",
};

function formatDetails(
  action: string,
  metadata: unknown,
  userNameById: Map<string, string>,
) {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as { from?: string | null; to?: string | null };

  if (action === "status_changed") {
    const from = meta.from ? (statusLabels[meta.from as JobStatus] ?? meta.from) : "—";
    const to = meta.to ? (statusLabels[meta.to as JobStatus] ?? meta.to) : "—";
    return `${from} → ${to}`;
  }

  if (action === "assigned" || action === "reassigned" || action === "unassigned") {
    const from = meta.from ? (userNameById.get(meta.from) ?? "Unknown") : "Unassigned";
    const to = meta.to ? (userNameById.get(meta.to) ?? "Unknown") : "Unassigned";
    return `${from} → ${to}`;
  }

  return null;
}

export default async function AuditPage() {
  await requireRole("ADMIN");

  const [entries, jobs, users] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.job.findMany({ select: { id: true, title: true } }),
    db.user.findMany({ select: { id: true, name: true } }),
  ]);

  const jobTitleById = new Map(jobs.map((j) => [j.id, j.title]));
  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Audit log</h1>

      <Card>
        <CardHeader>
          <CardTitle>Recent job activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const jobTitle = entry.jobId ? jobTitleById.get(entry.jobId) : null;
                  const actorName = entry.actorId
                    ? (userNameById.get(entry.actorId) ?? "Unknown")
                    : "—";
                  const details = formatDetails(entry.action, entry.metadata, userNameById);

                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatInTimeZone(entry.createdAt, COMPANY_TIME_ZONE, "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>{ACTION_LABELS[entry.action] ?? entry.action}</TableCell>
                      <TableCell>
                        {entry.jobId ? (
                          jobTitle ? (
                            <Link href={`/jobs/${entry.jobId}`} className="hover:underline">
                              {jobTitle}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Deleted job</span>
                          )
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{actorName}</TableCell>
                      <TableCell className="text-muted-foreground">{details ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
