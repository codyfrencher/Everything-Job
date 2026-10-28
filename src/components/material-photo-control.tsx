"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";

import { uploadMaterialPhoto, removeMaterialPhoto } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";

export function MaterialPhotoControl({
  materialId,
  photoUrl,
}: {
  materialId: string;
  photoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("file", file);
        await uploadMaterialPhoto(materialId, formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not upload photo");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  function handleRemove() {
    if (!window.confirm("Remove this material's photo?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await removeMaterialPhoto(materialId);
      } catch {
        setError("Could not remove photo");
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-md border object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed text-center text-[9px] leading-tight text-muted-foreground">
            No photo
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? "Uploading..." : photoUrl ? "Change" : "Add photo"}
        </Button>
        {photoUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleRemove}
          >
            Remove
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
