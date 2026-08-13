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

function toLocalInputValue(date: Date | null) {
  if (!date) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function JobForm({
  job,
  customers,
  techs,
  defaultCustomerId,
  action,
  submitLabel,
}: {
  job?: Job;
  customers: Customer[];
  techs: User[];
  defaultCustomerId?: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={job?.title} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerId">Customer</Label>
          <Select
            name="customerId"
            defaultValue={job?.customerId ?? defaultCustomerId}
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
          <Label htmlFor="assignedToId">Assigned to</Label>
          <Select
            name="assignedToId"
            defaultValue={job?.assignedToId ?? "unassigned"}
          >
            <SelectTrigger id="assignedToId" className="w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {techs.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={job?.status ?? "UNSCHEDULED"}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
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
            defaultValue={toLocalInputValue(job?.scheduledStart ?? null)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduledEnd">Scheduled end</Label>
          <Input
            id="scheduledEnd"
            name="scheduledEnd"
            type="datetime-local"
            defaultValue={toLocalInputValue(job?.scheduledEnd ?? null)}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={job?.description ?? ""} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="street">Job site street address</Label>
          <Input id="street" name="street" defaultValue={job?.street ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={job?.city ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={job?.state ?? "FL"} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" name="zip" defaultValue={job?.zip ?? ""} />
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
