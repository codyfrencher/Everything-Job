"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";

import { uploadJobPhoto, deleteJobPhoto } from "@/lib/actions/job-photos";
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDelete(photoId: string) {
    if (!window.confirm("Delete this photo? This can't be undone.")) return;
    setDeletingId(photoId);
    startTransition(() => {
      deleteJobPhoto(photoId).finally(() => setDeletingId(null));
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadJobPhoto(jobId, formData);
        if (result?.error) {
          setError(result.error);
          break;
        }
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
            <div key={photo.id} className="relative aspect-square">
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
                  aria-label="Delete photo"
                  onClick={() => handleDelete(photo.id)}
                  disabled={deletingId === photo.id}
                  className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-sm leading-none text-white shadow-sm disabled:opacity-50"
                >
                  {deletingId === photo.id ? "…" : "✕"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
        {photos.length > 0 ? (
          <Button asChild type="button" variant="outline" size="sm">
            <a href={`/api/jobs/${jobId}/photos/export`}>Download all</a>
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
