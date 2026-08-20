"use client";

import { useActionState, useState } from "react";

import { updateTeamMember } from "@/lib/actions/users";
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
import type { Role } from "@prisma/client";

export function EditTeamMemberForm({
  userId,
  name,
  email,
  phone,
  role,
  onCancel,
}: {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateTeamMember.bind(null, userId),
    undefined,
  );

  return (
    <form action={formAction} className="w-full max-w-lg space-y-3 rounded-lg border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`name-${userId}`}>Name</Label>
          <Input id={`name-${userId}`} name="name" defaultValue={name} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`email-${userId}`}>Email</Label>
          <Input
            id={`email-${userId}`}
            name="email"
            type="email"
            defaultValue={email}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`phone-${userId}`}>Phone</Label>
          <Input id={`phone-${userId}`} name="phone" defaultValue={phone ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`role-${userId}`}>Role</Label>
          <Select name="role" defaultValue={role}>
            <SelectTrigger id={`role-${userId}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TECH">Tech</SelectItem>
              <SelectItem value="DISPATCHER">Dispatcher</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Close
        </Button>
      </div>
    </form>
  );
}

/** Self-toggling wrapper for contexts with no column-width constraint to
 * work around, like the mobile stacked-card layout. The desktop table
 * expands a row instead, since a form this size doesn't fit in a table
 * cell — see TeamMemberRow. */
export function EditTeamMemberControl(props: {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
    );
  }

  return <EditTeamMemberForm {...props} onCancel={() => setOpen(false)} />;
}
