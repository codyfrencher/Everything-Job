import { timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { logJobAudit } from "@/lib/audit";

const payloadSchema = z.object({
  contactId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  street: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip: z.string().optional().or(z.literal("")),
  jobTitle: z.string().optional().or(z.literal("")),
  jobDescription: z.string().optional().or(z.literal("")),
});

function isAuthorized(request: Request): boolean {
  const expected = process.env.LEADCONNECTOR_WEBHOOK_SECRET;
  const provided = request.headers.get("x-webhook-secret");
  if (!expected || !provided) return false;

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data;
  try {
    data = payloadSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const customer = await db.customer.upsert({
      where: { externalId: data.contactId },
      create: {
        externalId: data.contactId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        street: data.street || null,
        city: data.city || null,
        state: data.state || "FL",
        zip: data.zip || null,
      },
      update: {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
      },
    });

    const job = await db.job.create({
      data: {
        title: data.jobTitle || `New lead: ${data.name}`,
        description: data.jobDescription || null,
        customerId: customer.id,
        status: "UNSCHEDULED",
        street: data.street || customer.street,
        city: data.city || customer.city,
        state: data.state || customer.state || "FL",
        zip: data.zip || customer.zip,
      },
    });

    await logJobAudit("created", job.id, null, {
      source: "leadconnector",
      contactId: data.contactId,
    });

    revalidatePath("/jobs");
    revalidatePath("/schedule");
    revalidatePath("/");

    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (err) {
    console.error("leadconnector webhook failed", err);
    return NextResponse.json({ error: "Could not process webhook" }, { status: 500 });
  }
}
