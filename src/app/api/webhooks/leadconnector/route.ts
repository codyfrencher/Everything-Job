import { timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { logJobAudit } from "@/lib/audit";
import { assertValidTimeRange } from "@/lib/job-rules";

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
  // Full ISO 8601 datetime strings (with an offset or "Z"), e.g. what
  // LeadConnector's appointment merge fields render as. A naive
  // "local" string with no offset would be ambiguous here since this
  // is a server-to-server call with no browser timezone to infer from.
  scheduledStart: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  scheduledEnd: z.string().datetime({ offset: true }).optional().or(z.literal("")),
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
  // Logged unconditionally (before auth/validation) while wiring up the
  // LeadConnector integration, so a misbehaving workflow step is
  // diagnosable from Vercel's function logs regardless of where it fails.
  const rawText = await request.text();
  console.log("leadconnector webhook received:", rawText);

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "Invalid payload: not valid JSON" }, { status: 400 });
  }

  // LeadConnector nests everything configured in a workflow's Webhook
  // action "Custom Data" section under a top-level customData object,
  // alongside its own standard contact/appointment fields — it's not a
  // flat body. Fall back to the raw body itself so a differently-shaped
  // caller (or a future LeadConnector change) still has a chance to work.
  const customData =
    rawBody && typeof rawBody === "object" && "customData" in rawBody
      ? (rawBody as { customData: unknown }).customData
      : rawBody;

  const parsed = payloadSchema.safeParse(customData);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // Echoes the caller's own submitted body back alongside the error —
    // only reachable with a valid secret already, and it's the fastest
    // way to see exactly what a misconfigured webhook step actually sent
    // without needing separate server log access.
    return NextResponse.json(
      {
        error: issue
          ? `Invalid payload: "${issue.path.join(".")}" — ${issue.message}`
          : "Invalid payload",
        received: customData,
      },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const scheduledStart = data.scheduledStart ? new Date(data.scheduledStart) : null;
  const scheduledEnd = data.scheduledEnd ? new Date(data.scheduledEnd) : null;

  const timeError = assertValidTimeRange(scheduledStart, scheduledEnd);
  if (timeError) {
    return NextResponse.json({ error: timeError }, { status: 400 });
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
        status: scheduledStart ? "SCHEDULED" : "UNSCHEDULED",
        scheduledStart,
        scheduledEnd,
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
