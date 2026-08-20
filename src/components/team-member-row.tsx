"use client";

import { useState } from "react";

import { EditTeamMemberForm } from "@/components/edit-team-member-control";
import { ResetPasswordControl } from "@/components/reset-password-control";
import { DeactivateTeamMemberControl } from "@/components/deactivate-team-member-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Role } from "@prisma/client";

export function TeamMemberRow({
  userId,
  name,
  email,
  phone,
  role,
  isDeactivated,
  isSelf,
}: {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isDeactivated: boolean;
  isSelf: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    // A table cell's default nowrap/tight width crushes a multi-field
    // form, so this spans the whole row instead of squeezing into the
    // Actions column.
    return (
      <TableRow>
        <TableCell colSpan={5} className="whitespace-normal">
          <EditTeamMemberForm
            userId={userId}
            name={name}
            email={email}
            phone={phone}
            role={role}
            onCancel={() => setEditing(false)}
          />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className={isDeactivated ? "opacity-60" : ""}>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="text-muted-foreground">{email}</TableCell>
      <TableCell>
        <Badge variant="secondary">{role}</Badge>
      </TableCell>
      <TableCell>
        {isDeactivated ? (
          <Badge variant="outline">Deactivated</Badge>
        ) : (
          <span className="text-muted-foreground">Active</span>
        )}
      </TableCell>
      <TableCell className="whitespace-normal">
        <div className="flex flex-wrap items-start gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <ResetPasswordControl userId={userId} />
          <DeactivateTeamMemberControl
            userId={userId}
            isDeactivated={isDeactivated}
            isSelf={isSelf}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
