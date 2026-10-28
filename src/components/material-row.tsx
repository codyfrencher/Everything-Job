"use client";

import { useState } from "react";

import { EditMaterialForm } from "@/components/edit-material-control";
import { ArchiveMaterialControl } from "@/components/archive-material-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { MaterialCalcType } from "@prisma/client";

const calcTypeLabels: Record<MaterialCalcType, string> = {
  PER_SQFT: "Square footage",
  PER_ROOM: "Room count",
  FLAT: "Flat",
};

export function MaterialRow({
  materialId,
  name,
  unit,
  calcType,
  rate,
  unitCost,
  isArchived,
}: {
  materialId: string;
  name: string;
  unit: string;
  calcType: MaterialCalcType;
  rate: number;
  unitCost: number;
  isArchived: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="whitespace-normal">
          <EditMaterialForm
            materialId={materialId}
            name={name}
            unit={unit}
            calcType={calcType}
            rate={rate}
            unitCost={unitCost}
            onCancel={() => setEditing(false)}
          />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className={isArchived ? "opacity-60" : ""}>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="text-muted-foreground">{unit}</TableCell>
      <TableCell>
        <Badge variant="secondary">{calcTypeLabels[calcType]}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{rate}</TableCell>
      <TableCell className="text-muted-foreground">${unitCost.toFixed(2)}</TableCell>
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
