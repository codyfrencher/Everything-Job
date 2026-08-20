import JSZip from "jszip";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

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

  const zip = new JSZip();
  const fetched = await Promise.all(
    job.photos.map(async (photo, index) => {
      try {
        const res = await fetch(photo.url);
        if (!res.ok) throw new Error(`fetch failed with status ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        const originalName = decodeURIComponent(
          photo.url.split("/").pop() || `photo-${index + 1}`,
        );
        return { name: `${String(index + 1).padStart(2, "0")}-${originalName}`, bytes };
      } catch (err) {
        console.error("exportJobPhotos: failed to fetch photo", photo.id, err);
        return null;
      }
    }),
  );

  for (const file of fetched) {
    if (file) zip.file(file.name, file.bytes);
  }

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  const zipBlob = new Blob([new Uint8Array(zipBytes)]);

  const safeTitle =
    job.title
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "job";

  return new NextResponse(zipBlob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeTitle}-photos.zip"`,
    },
  });
}
