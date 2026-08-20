import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";

import { ZipArchive } from "archiver";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

// Photos are streamed from blob storage straight into the zip as they're
// fetched, rather than buffered fully in memory first — a job can end up
// with a lot of photos, and this keeps memory use from scaling with the
// total size of all of them at once. Fetches are still batched (not fully
// serial) so a large photo count doesn't turn into one slow round-trip
// after another.
const FETCH_BATCH_SIZE = 4;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const job = await db.job.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { createdAt: "asc" } },
      assignments: { select: { userId: true } },
    },
  });
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (user.role === "TECH" && !job.assignments.some((a) => a.userId === user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (job.photos.length === 0) {
    return NextResponse.json({ error: "No photos to export" }, { status: 404 });
  }

  // level: 0 stores files as-is instead of deflating them — photos are
  // already-compressed image formats, so recompressing them just burns
  // CPU time for no space savings.
  const archive = new ZipArchive({ zlib: { level: 0 } });
  archive.on("warning", (err: Error) => console.error("exportJobPhotos: archiver warning", err));
  archive.on("error", (err: Error) => console.error("exportJobPhotos: archiver error", err));

  (async () => {
    for (let i = 0; i < job.photos.length; i += FETCH_BATCH_SIZE) {
      const batch = job.photos.slice(i, i + FETCH_BATCH_SIZE);
      await Promise.all(
        batch.map(async (photo, offset) => {
          const index = i + offset;
          try {
            const res = await fetch(photo.url);
            if (!res.ok || !res.body) {
              throw new Error(`fetch failed with status ${res.status}`);
            }
            const originalName = decodeURIComponent(
              photo.url.split("/").pop() || `photo-${index + 1}`,
            );
            archive.append(Readable.fromWeb(res.body as NodeWebReadableStream), {
              name: `${String(index + 1).padStart(2, "0")}-${originalName}`,
            });
          } catch (err) {
            console.error("exportJobPhotos: failed to fetch photo", photo.id, err);
          }
        }),
      );
    }
    archive.finalize();
  })();

  const safeTitle =
    job.title
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "job";

  return new NextResponse(Readable.toWeb(archive) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeTitle}-photos.zip"`,
    },
  });
}
