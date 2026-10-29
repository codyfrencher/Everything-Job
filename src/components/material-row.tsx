"use client";

import { useState } from "react";

import { EditMaterialForm } from "@/components/edit-material-control";
import { ArchiveMaterialControl } from "@/components/archive-material-control";
import { MaterialPhotoControl } from "@/components/material-photo-control";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

export function MaterialRow({
  materialId,
  name,
  keywords,
  photoUrl,
  isArchived,
}: {
  materialId: string;
  name: string;
  keywords: string | null;
  photoUrl: string | null;
  isArchived: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={4} className="whitespace-normal">
          <EditMaterialForm
            materialId={materialId}
            name={name}
            keywords={keywords}
            onCancel={() => setEditing(false)}
          />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className={isArchived ? "opacity-60" : ""}>
      <TableCell>
        <MaterialPhotoControl materialId={materialId} photoUrl={photoUrl} />
      </TableCell>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="text-muted-foreground">{keywords || "—"}</TableCell>
      <TableCell className="whitespace-normal">
        <div className="flex flex-wrap items-start gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <ArchiveMaterialControl materialId={materialId} isArchived={isArchived} />
        </div>
      </TableCell>
    </TableRow>
  );
}
