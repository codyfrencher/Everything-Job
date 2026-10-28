"use client";

import { useState, useTransition } from "react";

import { updateJobMaterialsInputs } from "@/lib/actions/jobs";
import { computeMaterialsEstimate, guessDimensionsFromScope } from "@/lib/materials-estimate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { Material } from "@prisma/client";

export function JobMaterialsEstimate({
  jobId,
  materials,
  estimatedSqft,
  estimatedRooms,
  scope,
  canEdit,
}: {
  jobId: string;
  materials: Material[];
  estimatedSqft: number | null;
  estimatedRooms: number | null;
  scope: string | null;
  canEdit: boolean;
}) {
  const [sqft, setSqft] = useState(estimatedSqft);
  const [rooms, setRooms] = useState(estimatedRooms);
  const [saved, setSaved] = useState({ sqft: estimatedSqft, rooms: estimatedRooms });
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Recomputed locally on every keystroke rather than waiting on a save
  // round trip — this is a guesstimate meant to be played with, not a
  // form you fill in blind and submit.
  const { lines, total } = computeMaterialsEstimate(materials, { sqft, rooms });
  const dirty = sqft !== saved.sqft || rooms !== saved.rooms;

  function handleGuess() {
    const guess = guessDimensionsFromScope(scope);
    if (guess.sqft) setSqft(guess.sqft);
    if (guess.rooms) setRooms(guess.rooms);
    setJustSaved(false);
  }

  function handleSave() {
    setError(null);
    setJustSaved(false);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("estimatedSqft", sqft ? String(sqft) : "");
        formData.set("estimatedRooms", rooms ? String(rooms) : "");
        await updateJobMaterialsInputs(jobId, formData);
        setSaved({ sqft, rooms });
        setJustSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  return (
    <div className="space-y-3">
      {canEdit ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="estimatedSqft">Affected sq ft</Label>
            <Input
              id="estimatedSqft"
              type="number"
              min={0}
              className="w-28"
              value={sqft ?? ""}
              onChange={(e) => {
                setSqft(e.target.value ? Number(e.target.value) : null);
                setJustSaved(false);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="estimatedRooms">Rooms</Label>
            <Input
              id="estimatedRooms"
              type="number"
              min={0}
              className="w-20"
              value={rooms ?? ""}
              onChange={(e) => {
                setRooms(e.target.value ? Number(e.target.value) : null);
                setJustSaved(false);
              }}
            />
          </div>
          {scope ? (
            <Button type="button" variant="outline" size="sm" onClick={handleGuess}>
              Guess from scope
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {sqft || rooms
            ? [sqft ? `${sqft} sq ft` : null, rooms ? `${rooms} room${rooms === 1 ? "" : "s"}` : null]
                .filter(Boolean)
                .join(" · ")
            : "No dimensions set yet."}
        </p>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {justSaved ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>
      ) : null}

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {materials.length === 0
            ? "No materials in the catalog yet — add some on the Materials page."
            : "Enter a square footage or room count to see an estimate."}
        </p>
      ) : (
        <div className="space-y-2">
          <Table>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.materialId}>
                  <TableCell className="py-1.5">{line.name}</TableCell>
                  <TableCell className="py-1.5 text-right text-muted-foreground">
                    {line.quantity} {line.unit}
                  </TableCell>
                  <TableCell className="py-1.5 text-right">
                    ${line.lineTotal.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end gap-3 pr-4 text-sm font-medium">
            <span>Estimated total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
