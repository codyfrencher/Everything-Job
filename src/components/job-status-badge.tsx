import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const statusStyles: Record<JobStatus, string> = {
  UNSCHEDULED: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  IN_PROGRESS:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  COMPLETED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const statusLabels: Record<JobStatus, string> = {
  UNSCHEDULED: "Unscheduled",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge className={cn("border-transparent", statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}

export { statusLabels };
