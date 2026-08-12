"use client";

import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import Image from "next/image";

import { addJobPhoto, deleteJobPhoto } from "@/lib/actions/job-photos";
import { Button } from "@/components/ui/button";
import type { JobPhoto } from "@prisma/client";

export function JobPhotos({
  jobId,
  photos,
  canDelete,
}: {
  jobId: string;
  photos: JobPhoto[];
  canDelete: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/job-photos/upload",
        });
        await addJobPhoto(jobId, blob.url);
      }
    } catch {
      setError("Couldn't upload photo. Try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square">
              <a href={photo.url} target="_blank" rel="noreferrer">
                <Image
                  src={photo.url}
                  alt="Job photo"
                  fill
                  sizes="150px"
                  className="rounded-md object-cover"
                />
              </a>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      deleteJobPhoto(photo.id);
                    })
                  }
                  disabled={isPending}
                  className="absolute top-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ✕
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading..." : "Add photo"}
        </Button>
        {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
