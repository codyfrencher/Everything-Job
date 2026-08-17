"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer, Job, User } from "@prisma/client";
import type { FormState } from "@/lib/actions/jobs";
import { statusLabels } from "@/components/job-status-badge";
import { toDateTimeLocalValue } from "@/lib/timezone";

export function JobForm({
  job,
  customers,
  techs,
  defaultCustomerId,
  action,
  submitLabel,
  readOnly = false,
}: {
  job?: Job & { assignments?: { userId: string }[] };
  customers: Customer[];
  techs: User[];
  defaultCustomerId?: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  /** Techs can only change status and notes — every other field is
   * disabled here for clarity, but the real enforcement is server-side
   * in updateJob, which ignores these fields for Tech submissions
   * regardless of what the form sends. */
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const assignedToIds = job?.assignments?.map((a) => a.userId) ?? [];

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            defaultValue={job?.title}
            required
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerId">Customer</Label>
          <Select
            name="customerId"
            defaultValue={job?.customerId ?? defaultCustomerId}
            disabled={readOnly}
          >
            <SelectTrigger id="customerId" className="w-full">
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Assigned techs</Label>
          <div className="space-y-1.5 rounded-lg border border-input p-3">
            {techs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No techs on the team yet.</p>
            ) : (
              techs.map((tech) => (
                <label
                  key={tech.id}
                  className="flex items-center gap-2 text-sm has-disabled:text-muted-foreground"
                >
                  <input
                    type="checkbox"
                    name="assignedToIds"
                    value={tech.id}
                    defaultChecked={assignedToIds.includes(tech.id)}
                    disabled={readOnly}
                    className="h-4 w-4 rounded border-input"
                  />
                  {tech.name}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={job?.status ?? "UNSCHEDULED"}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels)
                .filter(
                  ([value]) =>
                    value !== "CANCELLED" || !readOnly || job?.status === "CANCELLED",
                )
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div />

        <div className="space-y-2">
          <Label htmlFor="scheduledStart">Scheduled start</Label>
          <Input
            id="scheduledStart"
            name="scheduledStart"
            type="datetime-local"
            defaultValue={toDateTimeLocalValue(job?.scheduledStart ?? null)}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduledEnd">Scheduled end</Label>
          <Input
            id="scheduledEnd"
            name="scheduledEnd"
            type="datetime-local"
            defaultValue={toDateTimeLocalValue(job?.scheduledEnd ?? null)}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={job?.description ?? ""}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="street">Job site street address</Label>
          <Input
            id="street"
            name="street"
            defaultValue={job?.street ?? ""}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            defaultValue={job?.city ?? ""}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="state"
            defaultValue={job?.state ?? "FL"}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">ZIP</Label>
          <Input
            id="zip"
            name="zip"
            defaultValue={job?.zip ?? ""}
            disabled={readOnly}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={job?.notes ?? ""} />
        </div>
      </div>

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
