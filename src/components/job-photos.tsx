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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Upload a couple at once instead of fully sequentially — a tech dumping
  // a whole camera roll on a job shouldn't wait for each photo's full
  // round trip before the next one even starts. Kept low (not higher) on
  // purpose: these are full-size phone photos, and on a mobile connection
  // "full bars" reflects signal strength, not actual upload bandwidth —
  // too many large uploads competing for the same slow pipe increases the
  // odds any one of them times out.
  const UPLOAD_CONCURRENCY = 2;
  const UPLOAD_RETRIES = 2;

  function handleDelete(photoId: string) {
    if (!window.confirm("Delete this photo? This can't be undone.")) return;
    setDeletingId(photoId);
    startTransition(() => {
      deleteJobPhoto(photoId).finally(() => setDeletingId(null));
    });
  }

  async function uploadOnePhoto(file: File): Promise<string | null> {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    // Stable across every retry attempt for this file, so the server can
    // tell "this is a retry of an upload that actually already landed"
    // apart from "this is a genuinely new upload" — see uploadKey in
    // job-photos.ts.
    const uploadKey = crypto.randomUUID();
    // A field connection can drop mid-request and come back a moment
    // later — retry a network-level failure (the upload call throwing)
    // rather than giving up on the first blip. A validation failure
    // (wrong type, too large) comes back as a normal {error} result
    // instead of a throw, and retrying that would just fail the same
    // way again, so those return immediately.
    for (let attempt = 1; attempt <= UPLOAD_RETRIES + 1; attempt++) {
      try {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("uploadKey", uploadKey);
        const result = await uploadJobPhoto(jobId, formData);
        return result?.error ?? null;
      } catch (err) {
        if (attempt > UPLOAD_RETRIES) {
          // Include the file size and whatever detail the browser gives
          // for the failed request — a generic "check your connection"
          // with no numbers wasn't enough to tell a slow-connection
          // timeout apart from a specific file being unusually large.
          const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
          return `${sizeMb}MB — couldn't upload, check your connection${detail}`;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
    return `${sizeMb}MB — couldn't upload, check your connection`;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setError(null);
    setUploading(true);
    setProgress({ done: 0, total: fileList.length });

    let completed = 0;
    const failures: string[] = [];

    for (let i = 0; i < fileList.length; i += UPLOAD_CONCURRENCY) {
      const batch = fileList.slice(i, i + UPLOAD_CONCURRENCY);
      await Promise.all(
        batch.map(async (file) => {
          const error = await uploadOnePhoto(file);
          if (error) failures.push(`${file.name}: ${error}`);
          completed += 1;
          setProgress({ done: completed, total: fileList.length });
        }),
      );
    }

    setUploading(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";

    if (failures.length > 0) {
      const succeeded = fileList.length - failures.length;
      const more = failures.length > 1 ? ` (+${failures.length - 1} more)` : "";
      setError(
        succeeded > 0
          ? `${succeeded} of ${fileList.length} uploaded. ${failures[0]}${more}`
          : `${failures[0]}${more}`,
      );
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
          // No `capture` attribute here on purpose — setting one (even
          // "environment") makes mobile browsers jump straight into the
          // camera for a single shot and ignore `multiple` entirely.
          // Without it, the native picker shows both "Take Photo" and
          // "Photo Library" (multi-select) as separate options.
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {progress ? `Uploading ${progress.done} of ${progress.total}...` : "Add photos"}
        </Button>
        {photos.length > 0 ? (
          <Button asChild type="button" variant="outline" size="lg" className="flex-1">
            <a href={`/api/jobs/${jobId}/photos/export`}>Download all</a>
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
