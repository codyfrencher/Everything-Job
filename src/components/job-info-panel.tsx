"use client";

import { useActionState, useState } from "react";

import { updateJob } from "@/lib/actions/jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toDateTimeLocalValue } from "@/lib/timezone";
import type { Customer, Job, User } from "@prisma/client";

export function JobInfoPanel({
  job,
  customers,
  techs,
  assignedUserIds,
  scheduleLabel,
  canEdit,
}: {
  job: Job;
  customers: Customer[];
  techs: User[];
  assignedUserIds: string[];
  scheduleLabel: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateJob.bind(null, job.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  const customerName = customers.find((c) => c.id === job.customerId)?.name ?? "Unknown customer";
  const assignedTechs = assignedUserIds
    .map((id) => techs.find((t) => t.id === id))
    .filter((t): t is User => !!t);
  const cityStateZip = [
    [job.city, job.state].filter(Boolean).join(", "),
    job.zip,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Job info
        </p>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Close" : "Edit details"}
          </Button>
        ) : null}
      </div>

      <div className="divide-y overflow-hidden rounded-lg border text-sm">
        <div className="flex items-start gap-3 p-3">
          <span aria-hidden className="mt-0.5">🏢</span>
          <div>
            <p className="font-medium">{customerName}</p>
            <p className="text-xs text-muted-foreground">Customer</p>
          </div>
        </div>
        {job.street || cityStateZip ? (
          <div className="flex items-start gap-3 p-3">
            <span aria-hidden className="mt-0.5">📍</span>
            <div>
              {job.street ? <p className="font-medium">{job.street}</p> : null}
              {cityStateZip ? <p className="text-xs text-muted-foreground">{cityStateZip}</p> : null}
            </div>
          </div>
        ) : null}
        <div className="flex items-start gap-3 p-3">
          <span aria-hidden className="mt-0.5">🕒</span>
          <div>
            <p className="font-medium">{scheduleLabel ?? "Not scheduled"}</p>
            <p className="text-xs text-muted-foreground">Scheduled window</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3">
          <span aria-hidden className="mt-0.5">👷</span>
          <div>
            <p className="font-medium">Assigned</p>
            {assignedTechs.length === 0 ? (
              <p className="text-xs text-amber-600">Unassigned</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {assignedTechs.map((tech) => (
                  <span
                    key={tech.id}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 py-0.5 pr-2.5 pl-0.5 text-xs font-medium"
                  >
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      {tech.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    {tech.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <form action={formAction} className="space-y-4 bg-muted/30 p-4">
            <input type="hidden" name="title" value={job.title} />
            <input type="hidden" name="description" value={job.description ?? ""} />
            <input type="hidden" name="notes" value={job.notes ?? ""} />
            <input type="hidden" name="status" value={job.status} />

            <div className="space-y-2">
              <Label htmlFor="customerId">Customer</Label>
              <Select name="customerId" defaultValue={job.customerId}>
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
              <div className="space-y-1.5 rounded-lg border border-input bg-background p-3">
                {techs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No techs on the team yet.</p>
                ) : (
                  techs.map((tech) => (
                    <label key={tech.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="assignedToIds"
                        value={tech.id}
                        defaultChecked={assignedUserIds.includes(tech.id)}
                        className="h-4 w-4 rounded border-input"
                      />
                      {tech.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduledStart">Scheduled start</Label>
                <Input
                  id="scheduledStart"
                  name="scheduledStart"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(job.scheduledStart)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledEnd">Scheduled end</Label>
                <Input
                  id="scheduledEnd"
                  name="scheduledEnd"
                  type="datetime-local"
                  defaultValue={toDateTimeLocalValue(job.scheduledEnd)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Job site street address</Label>
              <Input id="street" name="street" defaultValue={job.street ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={job.city ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" defaultValue={job.state ?? "FL"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" name="zip" defaultValue={job.zip ?? ""} />
              </div>
            </div>

            {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving..." : "Save changes"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
